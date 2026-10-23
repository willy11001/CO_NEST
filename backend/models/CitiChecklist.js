const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CitiChecklist = sequelize.define('CitiChecklist', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  proximityToMainStreet: {
    type: DataTypes.INTEGER, // Proximity in meters
    allowNull: false,
    defaultValue: 100
  },
  waterSource: {
    type: DataTypes.ENUM('Camwater', 'Borehole', 'Well'),
    allowNull: false
  },
  waterRating: {
    type: DataTypes.DECIMAL(2, 1), // Rating 1.0 to 5.0
    allowNull: false,
    defaultValue: 3.0
  },
  eneoBackup: {
    type: DataTypes.BOOLEAN, // Has Solar panel or Generator backup
    allowNull: false,
    defaultValue: false
  },
  roadType: {
    type: DataTypes.ENUM('Tarred', 'Dirt'), // goudronné vs piste
    allowNull: false,
    defaultValue: 'Dirt'
  },
  rainySeasonPassable: {
    type: DataTypes.BOOLEAN, // Is road passable in heavy rains
    allowNull: false,
    defaultValue: true
  },
  estimatedMotoFare: {
    type: DataTypes.INTEGER, // Estimated fare in FCFA to main road
    allowNull: false,
    defaultValue: 100
  },
  securityLevel: {
    type: DataTypes.INTEGER, // Security index 1 to 5
    allowNull: false,
    defaultValue: 3,
    validate: {
      min: 1,
      max: 5
    }
  }
});

module.exports = CitiChecklist;
