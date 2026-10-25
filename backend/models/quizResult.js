const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const QuizResult = sequelize.define("QuizResult", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  courseTitle: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  totalQuestions: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  accuracy: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  difficulty: {
    type: DataTypes.STRING,
    defaultValue: "medium",
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: true,
    field: "quiz_questions",
  },
  selectedAnswers: {
    type: DataTypes.JSON,
    allowNull: true,
    field: "selected_answers",
  },
  completedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: "quiz_results",
  underscored: true,
  timestamps: true,
});

module.exports = QuizResult;
