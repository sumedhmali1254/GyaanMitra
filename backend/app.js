const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const aiRoutes = require("./ai_model/ai.routes");
const authRoutes = require("./routes/authRoutes");
const quizRoutes = require("./routes/quizRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const flashcardRoutes = require("./routes/flashcardRoutes");
const noteRoutes = require("./routes/noteRoutes");
const chatSessionRoutes = require("./routes/chatSessionRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL ||
  "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "GyaanMitra API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/sessions", require("./routes/sessionRoutes"));
app.use("/api/chatsessions", chatSessionRoutes);
app.use("/api/planner", require("./routes/plannerRoutes"));
app.use("/api", aiRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(errorHandler);

module.exports = app;
