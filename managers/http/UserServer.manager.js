const http = require('http');
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const { tooManyRequestError } = require('../_common/error.handler');
const app = express();

const lLimiter = rateLimit({
    windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    keyGenerator: (req) => {
        // Use ipKeyGenerator helper for IPv6 support
        return ipKeyGenerator(req.ip);
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        res.status(options.statusCode).json(tooManyRequestError('Too many requests, please try again later'));
    },
});

module.exports = class UserServer {
    constructor({ config, managers }) {
        this.config = config;
        this.managers = managers;
        this.userApi = managers.userApi;
    }

    /** for injecting middlewares */
    use(args) {
        app.use(args);
    }

    /** server configs */
    run() {
        app.use(cors({ origin: '*' }));
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));
        app.use('/static', express.static('public'));

        /** Swagger/OpenAPI Documentation */
        const swaggerSpec = this.managers.swagger.getSpec();
        app.use('/api-docs', swaggerUi.serve);
        app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
            customCss: '.swagger-ui .topbar { display: none }',
            customSiteTitle: 'School Management API Documentation',
            customfavIcon: '/static/favicon.png',
        }));
        app.get('/api-docs.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.send(swaggerSpec);
        });

        /** rate limiter */
        app.use(lLimiter);


        /** an error handler */
        app.use((err, req, res, next) => {
            console.error(err.stack)
            res.status(500).send('Something broke!')
        });

        /** a single middleware to handle all */
        // Support path parameters: /api/:moduleName/:fnName/:id
        app.all('/api/:moduleName/:fnName/:id?', this.userApi.mw);

        let server = http.createServer(app);
        server.listen(this.config.dotEnv.USER_PORT, () => {
            console.log(`${(this.config.dotEnv.SERVICE_NAME).toUpperCase()} is running on port: ${this.config.dotEnv.USER_PORT}`);
        });
    }
}