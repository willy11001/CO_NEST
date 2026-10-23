const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ConversationParticipants = sequelize.define('ConversationParticipants', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  conversationId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  joinedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'ConversationParticipants'
});

module.exports = ConversationParticipants;
