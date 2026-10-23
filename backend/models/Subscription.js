const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  planType: {
    type: DataTypes.ENUM('SILVER', 'GOLD', 'PLATINUM'),
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'REJECTED'),
    defaultValue: 'ACTIVE',
    allowNull: false
  }
});

module.exports = Subscription;
