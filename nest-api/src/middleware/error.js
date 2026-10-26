export const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// express 5 sends errors from async controllers here automatically
export const errorHandler = (err, req, res, next) => {
  let status = err.statusCode || 500;
  let message = err.message || "Something went wrong";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  }
  if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  }
  if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue).join(", ")} already exists`;
  }
  if (err.name === "MulterError") {
    status = 400;
    message = err.code === "LIMIT_UNEXPECTED_FILE" ? `Unexpected file field "${err.field}" (or too many files)` : err.message;
  }
  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON in request body";
  }

  if (status === 500) console.log(err);
  res.status(status).json({ message });
};
