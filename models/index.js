import { Sequelize, DataTypes } from 'sequelize';
import ChatMessageModel from './ChatMessage.js';
import DataSourceModel from './DataSource.js';
import IssueModel from './Issue.js';

let dbConnection;

if (process.env.DATABASE_URL) {
  dbConnection = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
} else {
  dbConnection = new Sequelize({
    dialect: 'sqlite',
    storage: './empire.sqlite'
  });
}

const ChatMessage = ChatMessageModel(dbConnection, DataTypes);
const DataSource = DataSourceModel(dbConnection, DataTypes);
const Issue = IssueModel(dbConnection, DataTypes);

export { dbConnection as sequelize, ChatMessage, DataSource, Issue };
