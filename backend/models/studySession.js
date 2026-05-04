const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const StudySession = sequelize.define(
    "StudySession",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      duration: {
        type: DataTypes.INTEGER, // in minutes
        allowNull: false,
      },
      mode: {
        type: DataTypes.STRING(20), // pomodoro, short_break, long_break
        defaultValue: "pomodoro",
      },
      startTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      endTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      status: {
        type: DataTypes.STRING(20), // completed, abandoned
        defaultValue: "completed",
      },
    },
    {
      tableName: "study_sessions",
      timestamps: true,
    }
  );

  return StudySession;
};
