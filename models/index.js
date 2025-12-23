import { Sequelize, DataTypes } from 'sequelize';
import ChatMessageModel from './ChatMessage.js';
import DataSourceModel from './DataSource.js';
import IssueModel from './Issue.js';

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
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
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './empire.sqlite'
  });
}

const ChatMessage = ChatMessageModel(sequelize, DataTypes);
const DataSource = DataSourceModel(sequelize, DataTypes);
const Issue = IssueModel(sequelize, DataTypes);

export { sequelize, ChatMessage, DataSource, Issue };
