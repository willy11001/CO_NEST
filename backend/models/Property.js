const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('Rent', 'Sale'),
    defaultValue: 'Rent',
    allowNull: false
  },
  propertyType: {
    type: DataTypes.ENUM('HOUSE', 'APARTMENT', 'LAND', 'STUDIO', 'COMMERCIAL'),
    allowNull: false
  },
  price: {
    type: DataTypes.DECIMAL(15, 2), // in FCFA
    allowNull: false
  },
  city: {
    type: DataTypes.STRING, // Yaoundé, Douala, Buea, Kribi, etc.
    allowNull: false
  },
  neighborhood: {
    type: DataTypes.STRING, // Logpom, Bastos, Molyko, etc.
    allowNull: false
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'REJECTED'),
    defaultValue: 'ACTIVE',
    allowNull: false
  }
});

module.exports = Property;
