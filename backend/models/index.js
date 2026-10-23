const sequelize = require('../config/database');
const Role = require('./Role');
const User = require('./User');
const Buyer = require('./Buyer');
const Renter = require('./Renter');
const Agent = require('./Agent');
const Administrator = require('./Administrator');
const OTP = require('./OTP');
const EmailService = require('./EmailService');
const Property = require('./Property');
const PropertyImage = require('./PropertyImage');
const CITI = require('./CITI');
const LandTitle = require('./LandTitle');
const KYC = require('./KYC');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Report = require('./Report');
const Block = require('./Block');
const Notification = require('./Notification');
const Payment = require('./Payment');
const Subscription = require('./Subscription');
const Promotion = require('./Promotion');
const Review = require('./Review');
const ConversationParticipants = require('./ConversationParticipants');
const MessageRead = require('./MessageRead');

// Associations

// 1. Role & User
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// 2. User Generalization / Specialization
User.hasOne(Buyer, { foreignKey: 'userId', as: 'buyerProfile', onDelete: 'CASCADE' });
Buyer.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Renter, { foreignKey: 'userId', as: 'renterProfile', onDelete: 'CASCADE' });
Renter.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Agent, { foreignKey: 'userId', as: 'agentProfile', onDelete: 'CASCADE' });
Agent.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasOne(Administrator, { foreignKey: 'userId', as: 'adminProfile', onDelete: 'CASCADE' });
Administrator.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 3. Agent & Property (Agent publishes Property)
Agent.hasMany(Property, { foreignKey: 'agentId', as: 'properties', onDelete: 'CASCADE' });
Property.belongsTo(Agent, { foreignKey: 'agentId', as: 'agent' });

// 4. Property & PropertyImage
Property.hasMany(PropertyImage, { foreignKey: 'propertyId', as: 'images', onDelete: 'CASCADE' });
PropertyImage.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// 5. Property & CITI (Property has CITI checklist)
Property.hasOne(CITI, { foreignKey: 'propertyId', as: 'citiIndex', onDelete: 'CASCADE' });
CITI.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// 6. Property & LandTitle (Property verified by LandTitle)
// Add landTitleId column to Property to map 0..1 relationship
Property.belongsTo(LandTitle, { foreignKey: 'landTitleId', as: 'landTitle', onDelete: 'SET NULL' });
LandTitle.hasOne(Property, { foreignKey: 'landTitleId', as: 'property' });

// 7. Agent & KYC (Agent has KYC verification)
Agent.hasOne(KYC, { foreignKey: 'agentId', as: 'kycDetails', onDelete: 'CASCADE' });
KYC.belongsTo(Agent, { foreignKey: 'agentId', as: 'agent' });

// 8. Chat Associations
Buyer.hasMany(Conversation, { foreignKey: 'buyerId', as: 'conversations', onDelete: 'CASCADE' });
Conversation.belongsTo(Buyer, { foreignKey: 'buyerId', as: 'buyer' });

Agent.hasMany(Conversation, { foreignKey: 'agentId', as: 'conversations', onDelete: 'CASCADE' });
Conversation.belongsTo(Agent, { foreignKey: 'agentId', as: 'agent' });

Property.hasMany(Conversation, { foreignKey: 'propertyId', as: 'conversations', onDelete: 'CASCADE' });
Conversation.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

Conversation.hasMany(Message, { foreignKey: 'conversationId', as: 'messages', onDelete: 'CASCADE' });
Message.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender', onDelete: 'CASCADE' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'messages' });

// 9. OTP & User
User.hasMany(OTP, { foreignKey: 'userId', as: 'otps', onDelete: 'CASCADE' });
OTP.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 10. Notification & User
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// 11. Review (User reviews Property)
User.hasMany(Review, { foreignKey: 'userId', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Property.hasMany(Review, { foreignKey: 'propertyId', as: 'reviews', onDelete: 'CASCADE' });
Review.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// 12. Block & User
Block.belongsTo(User, { foreignKey: 'blockerId', as: 'blocker', onDelete: 'CASCADE' });
Block.belongsTo(User, { foreignKey: 'blockedId', as: 'blocked', onDelete: 'CASCADE' });

// 13. Reports
Conversation.hasMany(Report, { foreignKey: 'conversationId', as: 'reports', onDelete: 'CASCADE' });
Report.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });

User.hasMany(Report, { foreignKey: 'reporterId', as: 'reports', onDelete: 'CASCADE' });
Report.belongsTo(User, { foreignKey: 'reporterId', as: 'reporter' });

// 14. Payments, Subscriptions & Promotions
User.hasMany(Payment, { foreignKey: 'userId', as: 'payments', onDelete: 'CASCADE' });
Payment.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(Subscription, { foreignKey: 'userId', as: 'subscriptions', onDelete: 'CASCADE' });
Subscription.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Property.hasMany(Promotion, { foreignKey: 'propertyId', as: 'promotions', onDelete: 'CASCADE' });
Promotion.belongsTo(Property, { foreignKey: 'propertyId', as: 'property' });

// ConversationParticipants & MessageRead
Conversation.hasMany(ConversationParticipants, { foreignKey: 'conversationId', as: 'participants', onDelete: 'CASCADE' });
ConversationParticipants.belongsTo(Conversation, { foreignKey: 'conversationId', as: 'conversation' });
User.hasMany(ConversationParticipants, { foreignKey: 'userId', as: 'participations', onDelete: 'CASCADE' });
ConversationParticipants.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Message.hasMany(MessageRead, { foreignKey: 'messageId', as: 'readReceipts', onDelete: 'CASCADE' });
MessageRead.belongsTo(Message, { foreignKey: 'messageId', as: 'message' });
User.hasMany(MessageRead, { foreignKey: 'userId', as: 'reads', onDelete: 'CASCADE' });
MessageRead.belongsTo(User, { foreignKey: 'userId', as: 'user' });

module.exports = {
  sequelize,
  Role,
  User,
  Buyer,
  Renter,
  Agent,
  Administrator,
  OTP,
  EmailService,
  Property,
  PropertyImage,
  CITI,
  LandTitle,
  KYC,
  Conversation,
  Message,
  Report,
  Block,
  Notification,
  Payment,
  Subscription,
  Promotion,
  Review,
  ConversationParticipants,
  MessageRead
};
