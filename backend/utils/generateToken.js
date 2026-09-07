const jwt = require("jsonwebtoken");

const generateToken = (id, options = {}) => {
  return jwt.sign({ id, ...options.payload }, process.env.JWT_SECRET, {
    expiresIn: options.expiresIn || process.env.JWT_EXPIRE || "7d",
  });
};

module.exports = generateToken;
