const jwt = require("jsonwebtoken");
const { User } = require("../models");

const guestReadOnlyPaths = new Set([
  "/api/chat",
  "/api/quiz/generate-ai",
  "/api/quiz/generate",
  "/api/settings/extract-syllabus",
]);

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.guest) {
        if (
          req.method !== "GET" &&
          !guestReadOnlyPaths.has(req.originalUrl.split("?")[0])
        ) {
          return res.status(403).json({
            success: false,
            message:
              "Guest sessions cannot save data. Please create an account to save your work.",
          });
        }

        req.user = {
          id: null,
          firstName: "Guest",
          lastName: "Learner",
          isGuest: true,
        };
        return next();
      }

      const user = await User.findByPk(decoded.id, {
        attributes: { exclude: ["password"] },
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "User not found",
        });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, token failed",
      });
    }
  } else {
    return res.status(401).json({
      success: false,
      message: "Not authorized, no token",
    });
  }
};

module.exports = { protect };
