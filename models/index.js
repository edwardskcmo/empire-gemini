const sequelize = require('../config/database');
const ChatMessage = require('./ChatMessage');
const Issue = require('./Issue');
const DataSource = require('./DataSource');

module.exports = {
    sequelize,
    ChatMessage,
    Issue,
    DataSource
};
