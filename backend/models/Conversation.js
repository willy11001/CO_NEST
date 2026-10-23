const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: true // Let's make it optional to keep it backward compatible, but available
  },
  buyerId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  lastMessageAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Conversation;
