const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

let sequelize;

// If DATABASE_URL exists, we are on Heroku (Postgres)
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false // This allows Heroku's self-signed certificates
      }
    },
    logging: false // Keeps your logs clean
  });
} else {
  // If no DATABASE_URL, we are working locally (SQLite)
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../empire.sqlite'),
    logging: false
  });
}

// Import your model files
// Note: We require the files and immediately call them with (sequelize, DataTypes)
const ChatMessage = require('./ChatMessage')(sequelize, DataTypes);
const DataSource = require('./DataSource')(sequelize, DataTypes);
const Issue = require('./Issue')(sequelize, DataTypes);

// Export the connection and the models
module.exports = {
  sequelize,
  ChatMessage,
  DataSource,
  Issue
};
