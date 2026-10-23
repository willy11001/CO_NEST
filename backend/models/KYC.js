const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const KYC = sequelize.define('KYC', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  agentId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  idType: {
    type: DataTypes.STRING, // e.g. CNI, PASSPORT
    allowNull: false,
    defaultValue: 'CNI'
  },
  idNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  idImage: {
    type: DataTypes.STRING, // CNI front & back (combining files/links or URL)
    allowNull: false
  },
  backImage: {
    type: DataTypes.STRING,
    allowNull: true
  },
  selfieImage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'PENDING', 'REJECTED'),
    defaultValue: 'PENDING',
    allowNull: false
  },
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'KYCs',
  timestamps: false
});

module.exports = KYC;
