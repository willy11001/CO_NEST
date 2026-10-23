const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CITI = sequelize.define('CITI', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  neighborhood: {
    type: DataTypes.STRING,
    allowNull: false
  },
  waterSupply: {
    type: DataTypes.INTEGER, // rating 1 to 5
    allowNull: false,
    defaultValue: 3,
    validate: { min: 1, max: 5 }
  },
  waterSource: {
    type: DataTypes.STRING, // e.g. Borehole, Camwater
    allowNull: false,
    defaultValue: 'Borehole'
  },
  electricity: {
    type: DataTypes.INTEGER, // rating 1 to 5
    allowNull: false,
    defaultValue: 3,
    validate: { min: 1, max: 5 }
  },
  roadAccess: {
    type: DataTypes.INTEGER, // rating 1 to 5
    allowNull: false,
    defaultValue: 3,
    validate: { min: 1, max: 5 }
  },
  roadType: {
    type: DataTypes.STRING, // e.g. Tarred, Dirt
    allowNull: false,
    defaultValue: 'Dirt'
  },
  security: {
    type: DataTypes.INTEGER, // rating 1 to 5
    allowNull: false,
    defaultValue: 3,
    validate: { min: 1, max: 5 }
  },
  proximityToMainStreet: {
    type: DataTypes.INTEGER, // distance in meters
    allowNull: false,
    defaultValue: 100
  },
  estimatedMotoFare: {
    type: DataTypes.INTEGER, // bike fare in FCFA
    allowNull: false,
    defaultValue: 150
  },
  overallScore: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: false,
    defaultValue: 3.00
  }
}, {
  tableName: 'CITIs',
  hooks: {
    beforeSave: (citi) => {
      // Calculate overall score automatically
      const avg = (citi.waterSupply + citi.electricity + citi.roadAccess + citi.security) / 4;
      citi.overallScore = parseFloat(avg.toFixed(2));
    }
  }
});

module.exports = CITI;
