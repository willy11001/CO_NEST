const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Renter = sequelize.define('Renter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  budgetMin: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  budgetMax: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true
  },
  moveInDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
}, {
  timestamps: false
});

module.exports = Renter;
