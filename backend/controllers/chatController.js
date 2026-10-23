const { Conversation, Message, User, Buyer, Agent, Block, Report } = require('../models');
const { Op } = require('sequelize');

// Start Conversation
exports.startConversation = async (req, res) => {
  const { agentId, propertyId } = req.body;

  try {
    // 1. Fetch Buyer Profile
    const buyer = await Buyer.findOne({ where: { userId: req.user.id } });
    if (!buyer) {
      return res.status(403).json({ message: 'Only registered buyers/renters can initiate conversations.' });
    }

    // 2. Fetch Agent Profile
    let agent = await Agent.findByPk(agentId);
    if (!agent) {
      agent = await Agent.findOne({ where: { userId: agentId } });
    }
    if (!agent) {
      agent = await Agent.findOne({
        include: [{
          model: User,
          as: 'user',
          where: {
            id: agentId
          }
        }]
      });
    }
    if (!agent) {
      agent = await Agent.findOne();
    }
    if (!agent) {
      return res.status(404).json({ message: 'Agent not found.' });
    }

    if (agent.userId === req.user.id) {
      return res.status(400).json({ message: 'You cannot start a conversation with yourself.' });
    }

    // 3. Check blocks
    const blocked = await Block.findOne({
      where: {
        [Op.or]: [
          { blockerId: req.user.id, blockedId: agent.userId },
          { blockerId: agent.userId, blockedId: req.user.id }
        ]
      }
    });

    if (blocked) {
      return res.status(403).json({ message: 'Communication blocked between these accounts.' });
    }

    // 4. Check if conversation already exists (for same buyer, agent, and optionally property)
    let conv = await Conversation.findOne({
      where: {
        buyerId: buyer.id,
        agentId: agent.id,
        propertyId: propertyId || null
      }
    });

    if (!conv) {
      conv = await Conversation.create({
        buyerId: buyer.id,
        agentId: agent.id,
        propertyId: propertyId || null
      });
    }

    res.status(201).json(conv);
  } catch (error) {
    res.status(500).json({ message: 'Server error starting conversation.', error: error.message });
  }
};

// Send Message
exports.sendMessage = async (req, res) => {
  const { conversationId, content, messageType, imageUrl } = req.body;

  try {
    const conv = await Conversation.findByPk(conversationId, {
      include: [
        { model: Buyer, as: 'buyer' },
        { model: Agent, as: 'agent' }
      ]
    });
    if (!conv) {
      return res.status(404).json({ message: 'Conversation thread not found.' });
    }

    // Check blocks
    const targetUserId = req.user.id === conv.buyer.userId ? conv.agent.userId : conv.buyer.userId;
    const blocked = await Block.findOne({
      where: {
        [Op.or]: [
          { blockerId: req.user.id, blockedId: targetUserId },
          { blockerId: targetUserId, blockedId: req.user.id }
        ]
      }
    });

    if (blocked) {
      return res.status(403).json({ message: 'Message sending blocked.' });
    }

    // Create message
    const msg = await Message.create({
      conversationId,
      senderId: req.user.id,
      messageType: (messageType || 'TEXT').toUpperCase(),
      content: content || '',
      imageUrl: imageUrl || null,
      isRead: false
    });

    // Update conversation lastMessageAt
    conv.lastMessageAt = new Date();
    await conv.save();

    res.status(201).json(msg);
  } catch (error) {
    res.status(500).json({ message: 'Server error sending message.', error: error.message });
  }
};

// Get Conversations List
exports.getConversations = async (req, res) => {
  try {
    // Check if user is buyer or agent
    const buyer = await Buyer.findOne({ where: { userId: req.user.id } });
    const agent = await Agent.findOne({ where: { userId: req.user.id } });

    const whereClause = {};
    if (buyer) {
      whereClause.buyerId = buyer.id;
    } else if (agent) {
      whereClause.agentId = agent.id;
    } else {
      return res.json([]); // Admins don't have personal conversations
    }

    const conversations = await Conversation.findAll({
      where: whereClause,
      include: [
        {
          model: Buyer,
          as: 'buyer',
          include: [{ model: User, as: 'user', attributes: ['fullName', 'email', 'profileImage', 'lastSeen'] }]
        },
        {
          model: Agent,
          as: 'agent',
          include: [{ model: User, as: 'user', attributes: ['fullName', 'email', 'profileImage', 'lastSeen'] }]
        },
        {
          model: Message,
          as: 'messages',
          limit: 1,
          order: [['createdAt', 'DESC']]
        }
      ],
      order: [['lastMessageAt', 'DESC']]
    });

    let filteredConversations = conversations;
    if (agent) {
      filteredConversations = [];
      for (const c of conversations) {
        const hasMsg = await Message.count({ where: { conversationId: c.id } });
        if (hasMsg > 0) {
          filteredConversations.push(c);
        }
      }
    }

    res.json(filteredConversations);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching conversations.', error: error.message });
  }
};

// Get Messages
exports.getMessages = async (req, res) => {
  const { conversationId } = req.params;

  try {
    const conv = await Conversation.findByPk(conversationId, {
      include: [
        { model: Buyer, as: 'buyer' },
        { model: Agent, as: 'agent' }
      ]
    });
    if (!conv) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }

    // Verify user belongs to conversation
    const isMember = req.user.id === conv.buyer.userId || req.user.id === conv.agent.userId;
    const isAdmin = req.user.role && req.user.role.name === 'ADMIN';

    if (!isMember && !isAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const messages = await Message.findAll({
      where: { conversationId },
      order: [['createdAt', 'ASC']]
    });

    // Mark other's messages as read
    await Message.update(
      { isRead: true },
      {
        where: {
          conversationId,
          senderId: { [Op.ne]: req.user.id }
        }
      }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error loading messages.', error: error.message });
  }
};

// Block User
exports.blockUser = async (req, res) => {
  const { blockedId } = req.body; // User ID

  if (blockedId === req.user.id) {
    return res.status(400).json({ message: 'You cannot block yourself.' });
  }

  try {
    const exists = await Block.findOne({ where: { blockerId: req.user.id, blockedId } });
    if (exists) {
      return res.json({ message: 'User is already blocked.' });
    }

    await Block.create({ blockerId: req.user.id, blockedId });
    res.status(201).json({ message: 'User blocked successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error blocking user.', error: error.message });
  }
};

// Unblock User
exports.unblockUser = async (req, res) => {
  const { blockedId } = req.body;
  try {
    const deleted = await Block.destroy({ where: { blockerId: req.user.id, blockedId } });
    if (!deleted) {
      return res.status(400).json({ message: 'User is not blocked.' });
    }
    res.json({ message: 'User unblocked successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error unblocking user.', error: error.message });
  }
};

// Get Block Status
exports.getBlockStatus = async (req, res) => {
  const { otherUserId } = req.query;
  if (!otherUserId) {
    return res.status(400).json({ message: 'otherUserId is required.' });
  }
  try {
    const blockedByMe = await Block.findOne({ where: { blockerId: req.user.id, blockedId: otherUserId } });
    const blockedByOther = await Block.findOne({ where: { blockerId: otherUserId, blockedId: req.user.id } });
    res.json({
      blockedByMe: !!blockedByMe,
      blockedByOther: !!blockedByOther
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error checking block status.', error: error.message });
  }
};

// Report Conversation
exports.reportConversation = async (req, res) => {
  const { conversationId, reason, description } = req.body;

  try {
    const report = await Report.create({
      conversationId,
      reporterId: req.user.id,
      reason,
      description: description || '',
      status: 'PENDING'
    });

    res.status(201).json({ message: 'Conversation reported to administrators.', report });
  } catch (error) {
    res.status(500).json({ message: 'Server error submitting report.', error: error.message });
  }
};
