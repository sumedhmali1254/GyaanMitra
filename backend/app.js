const express = require("express");
const cors = require("cors");
require("dotenv").config();

const aiRoutes = require("./ai_model/ai.routes");
const authRoutes = require("./routes/authRoutes");
const quizRoutes = require("./routes/quizRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const flashcardRoutes = require("./routes/flashcardRoutes");
const noteRoutes = require("./routes/noteRoutes");
const chatSessionRoutes = require("./routes/chatSessionRoutes");
const { errorHandler } = require("./middleware/errorMiddleware");

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",").map((o) => o.trim())
        : ["http://localhost:5173", "http://localhost:5174"];
      if (!origin || allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
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
app.use("/uploads", express.static("uploads"));

app.use(errorHandler);

module.exports = app;