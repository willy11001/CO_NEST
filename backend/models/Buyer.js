const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Buyer = sequelize.define('Buyer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  preferredCity: {
    type: DataTypes.STRING,
    allowNull: true
  },
  preferredNeighborhood: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: false
});

module.exports = Buyer;
