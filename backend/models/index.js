const sequelize = require("../config/database");
const User = require("./user");
const Flashcard = require("./flashcard");
const Note = require("./note");
const StudySession = require("./studySession")(sequelize);
const QuizResult = require("./quizResult");
const ChatSession = require("./chatSession");
const PlannerSubject = require("./plannerSubject");
const PlannerSession = require("./plannerSession");
const PlannerRecommendation = require("./plannerRecommendation");

// Associations
User.hasMany(Flashcard, { foreignKey: 'userId', onDelete: 'CASCADE' });
Flashcard.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Note, { foreignKey: 'userId', onDelete: 'CASCADE' });
Note.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(StudySession, { foreignKey: 'userId', onDelete: 'CASCADE' });
StudySession.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(QuizResult, { foreignKey: 'userId', onDelete: 'CASCADE' });
QuizResult.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ChatSession, { foreignKey: 'userId', onDelete: 'CASCADE' });
ChatSession.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PlannerSubject, { foreignKey: 'userId', onDelete: 'CASCADE' });
PlannerSubject.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PlannerSession, { foreignKey: 'userId', onDelete: 'CASCADE' });
PlannerSession.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(PlannerRecommendation, { foreignKey: 'userId', onDelete: 'CASCADE' });
PlannerRecommendation.belongsTo(User, { foreignKey: 'userId' });

const db = {
  sequelize,
  User,
  Flashcard,
  Note,
  StudySession,
  QuizResult,
  ChatSession,
  PlannerSubject,
  PlannerSession,
  PlannerRecommendation,
};

module.exports = db;
