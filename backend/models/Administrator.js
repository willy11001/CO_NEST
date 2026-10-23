const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Administrator = sequelize.define('Administrator', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  timestamps: false
});

module.exports = Administrator;
