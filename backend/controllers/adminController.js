const { User, KYC, Agent, Property, LandTitle, Payment, Conversation, Role } = require('../models');

// Dashboard Analytics
exports.getDashboardAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const verifiedAgents = await Agent.count({ where: { isVerified: true } });
    const totalListings = await Property.count();
    const pendingKyc = await KYC.count({ where: { status: 'PENDING' } });

    // Calculate revenue
    const payments = await Payment.findAll({ where: { status: 'SUCCESS' } });
    const totalRevenue = payments.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    // Recent transactions log
    const recentPayments = await Payment.findAll({
      limit: 5,
      order: [['paidAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['fullName', 'email'] }]
    });

    res.json({
      analytics: {
        totalUsers,
        verifiedAgents,
        totalListings,
        pendingKyc,
        totalRevenue
      },
      recentPayments
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error loading analytics.', error: error.message });
  }
};

// Get Users List
exports.getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role' },
        {
          model: Agent,
          as: 'agentProfile',
          include: [{ model: KYC, as: 'kycDetails' }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error loading users.', error: error.message });
  }
};

// Get Pending KYC Requests
exports.getPendingKyc = async (req, res) => {
  try {
    const requests = await KYC.findAll({
      where: { status: 'PENDING' },
      include: [
        { 
          model: Agent, 
          as: 'agent',
          include: [{ model: User, as: 'user', attributes: ['fullName', 'email'] }]
        }
      ],
      order: [['submittedAt', 'ASC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching KYC requests.', error: error.message });
  }
};

// Verify KYC Submission
exports.verifyKyc = async (req, res) => {
  const { requestId, status, adminNotes } = req.body; // status: ACTIVE (approved) or REJECTED

  if (!['ACTIVE', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid verification status decision.' });
  }

  try {
    const kyc = await KYC.findByPk(requestId);
    if (!kyc) {
      return res.status(404).json({ message: 'KYC request not found.' });
    }

    const agent = await Agent.findByPk(kyc.agentId);
    if (!agent) {
      return res.status(404).json({ message: 'Agent profile not found.' });
    }

    // Update KYC request record
    kyc.status = status;
    kyc.verifiedAt = new Date();
    await kyc.save();

    // Update Agent's verification flag and User status
    agent.isVerified = (status === 'ACTIVE');
    await agent.save();

    // Set matching User status to active
    const user = await User.findByPk(agent.userId);
    if (user) {
      user.status = status === 'ACTIVE' ? 'ACTIVE' : 'REJECTED';
      await user.save();
    }

    res.json({
      message: `KYC request has been ${status === 'ACTIVE' ? 'approved' : 'rejected'} successfully.`,
      kyc,
      agentVerified: agent.isVerified
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during KYC review.', error: error.message });
  }
};

// Add to Land Registry (Add new Titre Foncier)
exports.addToLandRegistry = async (req, res) => {
  const { titleNumber, ownerName, location, status, registeredAt } = req.body;

  try {
    const exists = await LandTitle.findOne({ where: { titleNumber } });
    if (exists) {
      return res.status(400).json({ message: 'This Land Title number already exists in simulated registry.' });
    }

    const newTitle = await LandTitle.create({
      titleNumber,
      ownerName,
      location,
      status: status || 'ACTIVE', // ACTIVE, INACTIVE, PENDING, REJECTED
      registeredAt: registeredAt || new Date().toISOString().split('T')[0]
    });

    res.status(201).json({
      message: 'New land title successfully registered in MINDCAF registry.',
      title: newTitle
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating land title record.', error: error.message });
  }
};

// Get Reported Chats
exports.getReportedConversations = async (req, res) => {
  try {
    const { Report, Conversation, User } = require('../models');
    const reports = await Report.findAll({
      include: [
        {
          model: Conversation,
          as: 'conversation'
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['id', 'fullName', 'email']
        }
      ]
    });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reported conversations.', error: error.message });
  }
};

// Resolve Report
exports.resolveReport = async (req, res) => {
  const { reportId } = req.body;
  try {
    const { Report } = require('../models');
    const report = await Report.findByPk(reportId);
    if (!report) {
      return res.status(404).json({ message: 'Report not found.' });
    }
    report.status = 'RESOLVED';
    await report.save();
    res.json({ message: 'Report marked as resolved successfully.', report });
  } catch (error) {
    res.status(500).json({ message: 'Server error resolving report.', error: error.message });
  }
};

// Admin Login Route
exports.adminLogin = async (req, res) => {
  const { email, password } = req.body;
  const bcrypt = require('bcryptjs');
  const jwt = require('jsonwebtoken');

  try {
    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role' }]
    });

    const roleName = user && user.role ? user.role.name : '';
    if (!user || roleName !== 'ADMIN') {
      return res.status(400).json({ message: 'Invalid admin credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid admin credentials.' });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'conest_super_secret_jwt_key_2026_cameroon';
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: roleName
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Admin login error.', error: error.message });
  }
};
