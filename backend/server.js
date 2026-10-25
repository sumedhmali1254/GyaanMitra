const app = require("./app");
const db = require("./models");
const { DataTypes } = require("sequelize");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log("Database connected successfully");

    await db.sequelize.sync();
    const queryInterface = db.sequelize.getQueryInterface();
    const quizResultColumns = await queryInterface.describeTable("quiz_results");
    if (!quizResultColumns.quiz_questions) {
      await queryInterface.addColumn("quiz_results", "quiz_questions", {
        type: DataTypes.JSON,
        allowNull: true,
      });
    }
    if (!quizResultColumns.selected_answers) {
      await queryInterface.addColumn("quiz_results", "selected_answers", {
        type: DataTypes.JSON,
        allowNull: true,
      });
    }
    console.log("Database synced successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error.message);
    process.exit(1);
  }
};

startServer();
// restart
