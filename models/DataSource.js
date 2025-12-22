const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DataSource = sequelize.define('DataSource', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'Document'
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false
    },
    // NEW: This is where we will store the text extracted from your files
    content: {
        type: DataTypes.TEXT,
        allowNull: true 
    }
});

module.exports = DataSource;