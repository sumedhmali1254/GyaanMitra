const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PlannerSubject = sequelize.define(
  "PlannerSubject",
  {
    id: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    chapters: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    chaptersRemaining: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    avg_chapter_time: {
      type: DataTypes.FLOAT,
      defaultValue: 1.0,
    },
    examDate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    priority: {
      type: DataTypes.STRING,
      defaultValue: "normal",
    },
    beginnerMode: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    scheduleMode: {
      type: DataTypes.STRING,
      defaultValue: "average",
    },
    familiarity: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    syllabusSize: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    difficulty: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    pastScore: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    completion: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    startTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    endTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    availableHours: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    weeklyAvailability: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "planner_subjects",
    timestamps: true,
  }
);

module.exports = PlannerSubject;
