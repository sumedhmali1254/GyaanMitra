const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const PlannerRecommendation = sequelize.define(
  "PlannerRecommendation",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    subjectName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    priority: {
      type: DataTypes.STRING,
      defaultValue: "normal",
    },
    daysLeft: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    hoursNeeded: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    hoursAvailable: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    hoursScheduled: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    chaptersCoverable: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    chaptersTotal: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    percentageCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    shortageHours: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    isWarning: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "planner_recommendations",
    timestamps: true,
  }
);

module.exports = PlannerRecommendation;
