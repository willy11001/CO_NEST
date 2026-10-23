const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const KycRequest = sequelize.define('KycRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  agentId: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  cniNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cniFrontImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  cniBackImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  selfieImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    defaultValue: 'Pending',
    allowNull: false
  },
  adminNotes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = KycRequest;
