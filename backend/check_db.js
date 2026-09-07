
const { Flashcard } = require("./models");
const sequelize = require("./config/database");

async function checkCards() {
  try {
    const cards = await Flashcard.findAll({
      attributes: ['subject', 'chapter', 'source', 'userId'],
      limit: 10
    });
    console.log("Current Flashcards (last 10):", JSON.stringify(cards, null, 2));
    
    const counts = await Flashcard.findAll({
      attributes: ['source', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['source']
    });
    console.log("Distribution by source:", JSON.stringify(counts, null, 2));

  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit();
  }
}

checkCards();
