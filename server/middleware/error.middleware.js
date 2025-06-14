/**
 * Global error handling middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const errorMiddleware = (err, req, res, next) => {
    // Log error for debugging
    console.error(err.stack);

    // Default error status and message
    const status = err.status || 500;
    const message = err.message || 'Qualcosa è andato storto.';

    // Handle specific error types
    let errorResponse = {
        status: 'error',
        message,
    };

    // Add validation errors if available
    if (err.errors) {
        errorResponse.errors = err.errors;
    }

    // Send response
    res.status(status).json(errorResponse);
};

module.exports = errorMiddleware;