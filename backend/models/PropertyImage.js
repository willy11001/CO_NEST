const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PropertyImage = sequelize.define('PropertyImage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: false
  },
  isMain: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
});

module.exports = PropertyImage;
