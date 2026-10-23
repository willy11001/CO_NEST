const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  paymentType: {
    type: DataTypes.ENUM('SUBSCRIPTION', 'PROMOTION'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2), // in FCFA
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('MTN_MOMO', 'ORANGE_MONEY'),
    allowNull: false
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED'),
    defaultValue: 'PENDING',
    allowNull: false
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = Payment;
