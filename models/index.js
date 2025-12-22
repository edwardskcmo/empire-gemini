const { Sequelize, DataTypes } = require('sequelize');

let sequelize;

// If we are on Heroku, use the Postgres URL provided by the add-on
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // This is the 'Secret Sauce' for Heroku Postgres
      }
    }
  });
} else {
  // If we are on your local computer, use the SQLite file
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './empire.sqlite'
  });
}

// Pass the connection to each model
const ChatMessage = require('./ChatMessage')(sequelize, DataTypes);
const DataSource = require('./DataSource')(sequelize, DataTypes);
const Issue = require('./Issue')(sequelize, DataTypes);

module.exports = {
  sequelize,
  ChatMessage,
  DataSource,
  Issue
};
