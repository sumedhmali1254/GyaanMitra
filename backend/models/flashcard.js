const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Flashcard = sequelize.define("Flashcard", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  question: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  answer: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  chapter: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  topic: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  source: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pdf'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = Flashcard;
