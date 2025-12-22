const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Issue = sequelize.define('Issue', {
    description: {
        type: DataTypes.STRING,
        allowNull: false
    },
    department: {
        type: DataTypes.STRING,
        defaultValue: 'General'
    },
    priority: {
        type: DataTypes.STRING,
        defaultValue: 'Normal'
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'Open'
    },
    assignee: {
        type: DataTypes.STRING,
        defaultValue: 'Unassigned'
    }
});

module.exports = Issue;
