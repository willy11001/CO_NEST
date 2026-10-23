const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const LandTitle = sequelize.define('LandTitle', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titleNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  ownerName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'REJECTED'),
    defaultValue: 'ACTIVE',
    allowNull: false
  },
  registeredAt: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  landArea: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: 500.00
  },
  boundaries: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: 'Boundaries details registered at MINDCAF registry offices.'
  }
});

module.exports = LandTitle;
