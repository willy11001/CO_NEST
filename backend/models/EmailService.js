const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EmailService = sequelize.define('EmailService', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  provider: {
    type: DataTypes.STRING,
    allowNull: false
  },
  smtpEmail: {
    type: DataTypes.STRING,
    allowNull: false
  },
  smtpPassword: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  timestamps: false
});

module.exports = EmailService;
