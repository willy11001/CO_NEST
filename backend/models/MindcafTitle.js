const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MindcafTitle = sequelize.define('MindcafTitle', {
  titleNumber: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  ownerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  registrationDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  boundaries: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  landArea: {
    type: DataTypes.DECIMAL(10, 2), // land area in square meters
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Active', 'Disputed'),
    defaultValue: 'Active',
    allowNull: false
  },
  warningCaveats: {
    type: DataTypes.TEXT, // warning details for litigation
    allowNull: true
  }
});

module.exports = MindcafTitle;
