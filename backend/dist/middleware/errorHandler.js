"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.AppError = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
class AppError extends Error {
    statusCode;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    if (err instanceof zod_1.ZodError) {
        return res.status(400).json({
            error: 'Validation error',
            details: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
            })),
        });
    }
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return res.status(409).json({
                error: 'A record with this value already exists',
            });
        }
        if (err.code === 'P2025') {
            return res.status(404).json({
                error: 'Record not found',
            });
        }
    }
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            error: err.message,
        });
    }
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map