const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ChatSession = sequelize.define("ChatSession", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    defaultValue: "New Chat",
    allowNull: false,
  },
  messages: {
    type: DataTypes.JSON,
    defaultValue: [],
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
});

module.exports = ChatSession;
