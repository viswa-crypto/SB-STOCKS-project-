// Wraps async route handlers so errors are forwarded to the error middleware
// instead of needing a try/catch block in every controller.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
