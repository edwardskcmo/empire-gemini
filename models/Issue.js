export default (sequelize, DataTypes) => {
    const Issue = sequelize.define('Issue', {
        description: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        priority: {
            type: DataTypes.STRING,
            defaultValue: 'Normal'
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'Open'
        },
        department: {
            type: DataTypes.STRING,
            defaultValue: 'General'
        },
        assignee: {
            type: DataTypes.STRING,
            defaultValue: 'Unassigned'
        }
    });
    return Issue;
};

