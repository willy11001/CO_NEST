const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const {
  User,
  Role,
  Property,
  LandTitle,
  KYC,
  Payment,
  Agent, Buyer,
  Renter,
  Conversation
} = require('../backend/models');

const app = express();
const PORT = process.env.ADMIN_PORT || 8081;
const JWT_SECRET = process.env.JWT_SECRET || 'conest_super_secret_jwt_key_2026_cameroon';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Static Frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Admin Authorization Middleware
const adminAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No authorization token provided.' });
  }

  const token = authHeader.replace(/^Bearer\s+(Bearer\s+)?/i, '');

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    const roleName = user && user.role ? user.role.name : '';
    if (!user || roleName !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied: Admin privileges required.' });
    }

    req.admin = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Session token invalid or expired.' });
  }
};

// API Endpoints

// 1. Admin Login
app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body;

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
});

// 2. Analytics Overview
app.get('/api/admin/analytics', adminAuth, async (req, res) => {
  try {
    const totalUsers = await User.count();
    const verifiedUsers = await Agent.count({ where: { isVerified: true } });
    const totalListings = await Property.count();
    const pendingKyc = await KYC.count({ where: { status: 'PENDING' } });

    // Calculate revenue
    const payments = await Payment.findAll({ where: { status: 'SUCCESS' } });
    const totalRevenue = payments.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    res.json({
      totalUsers,
      verifiedUsers,
      verifiedAgents: verifiedUsers,
      totalListings,
      pendingKyc,
      totalRevenue
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics.', error: error.message });
  }
});

// 3. Get Users List
app.get('/api/admin/users', adminAuth, async (req, res) => {
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
    res.status(500).json({ message: 'Error loading users list.', error: error.message });
  }
});

// 3a. Create User Account
app.post('/api/admin/users', adminAuth, async (req, res) => {
  const { fullName, email, password, role, cniNumber } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    const normalizedRole = (role || 'BUYER').toUpperCase();
    const roleRecord = await Role.findOne({ where: { name: normalizedRole } });
    if (!roleRecord) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || '123456', salt);

    const user = await User.create({
      id: Math.floor(10000000 + Math.random() * 90000000),
      fullName,
      email,
      password: hashedPassword,
      rawPassword: password || '123456',
      status: 'ACTIVE',
      roleId: roleRecord.id
    });

    let agentId = null;
    const { Administrator } = require('../backend/models');
    
    if (normalizedRole === 'BUYER') {
      await Buyer.create({ userId: user.id });
    } else if (normalizedRole === 'RENTER') {
      await Renter.create({ userId: user.id });
    } else if (normalizedRole === 'AGENT') {
      const agent = await Agent.create({
        userId: user.id,
        agencyName: 'CoNest Verified Agent',
        agencyAddress: 'Cameroon',
        isVerified: !!cniNumber
      });
      agentId = agent.id;
    } else if (normalizedRole === 'ADMIN') {
      await Administrator.create({ userId: user.id });
    }

    if (cniNumber) {
      if (!agentId) {
        const agent = await Agent.create({
          userId: user.id,
          agencyName: 'Buyer/Renter Verified Profile',
          agencyAddress: 'N/A',
          isVerified: true
        });
        agentId = agent.id;
      }

      await KYC.create({
        agentId,
        idType: 'CNI',
        idNumber: cniNumber,
        idImage: 'pre_registered_cni_front.png',
        backImage: 'pre_registered_cni_back.png',
        selfieImage: 'pre_registered_selfie.png',
        status: 'ACTIVE',
        submittedAt: new Date(),
        verifiedAt: new Date()
      });
    }

    res.status(201).json({ message: 'User created successfully.', user });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user.', error: error.message });
  }
});

// 3b. Update User Account
app.put('/api/admin/users/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { fullName, email, role, cniNumber } = req.body;

  try {
    const user = await User.findByPk(id, {
      include: [
        { model: Role, as: 'role' },
        { model: Agent, as: 'agentProfile', include: [{ model: KYC, as: 'kycDetails' }] }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.fullName = fullName || user.fullName;
    user.email = email || user.email;

    if (role && (!user.role || user.role.name !== role.toUpperCase())) {
      const normalizedRole = role.toUpperCase();
      const roleRecord = await Role.findOne({ where: { name: normalizedRole } });
      if (roleRecord) {
        user.roleId = roleRecord.id;

        const { Administrator } = require('../backend/models');
        await Buyer.destroy({ where: { userId: user.id } });
        await Renter.destroy({ where: { userId: user.id } });
        await Agent.destroy({ where: { userId: user.id } });
        await Administrator.destroy({ where: { userId: user.id } });

        if (normalizedRole === 'BUYER') {
          await Buyer.create({ userId: user.id });
        } else if (normalizedRole === 'RENTER') {
          await Renter.create({ userId: user.id });
        } else if (normalizedRole === 'AGENT') {
          await Agent.create({
            userId: user.id,
            agencyName: 'CoNest Verified Agent',
            agencyAddress: 'Cameroon',
            isVerified: !!cniNumber
          });
        } else if (normalizedRole === 'ADMIN') {
          await Administrator.create({ userId: user.id });
        }
      }
    }

    await user.save();

    const normalizedRoleForKyc = role ? role.toUpperCase() : (user.role?.name || 'BUYER');
    let agent = await Agent.findOne({ where: { userId: user.id } });
    if (cniNumber && !agent) {
      agent = await Agent.create({
        userId: user.id,
        agencyName: normalizedRoleForKyc === 'AGENT' ? 'CoNest Verified Agent' : 'Buyer/Renter Verified Profile',
        agencyAddress: 'N/A',
        isVerified: true
      });
    }

    if (agent) {
      if (cniNumber) {
        let kyc = await KYC.findOne({ where: { agentId: agent.id } });
        if (kyc) {
          kyc.idNumber = cniNumber;
          kyc.status = 'ACTIVE';
          await kyc.save();
        } else {
          await KYC.create({
            agentId: agent.id,
            idType: 'CNI',
            idNumber: cniNumber,
            idImage: 'pre_registered_cni_front.png',
            backImage: 'pre_registered_cni_back.png',
            selfieImage: 'pre_registered_selfie.png',
            status: 'ACTIVE',
            submittedAt: new Date(),
            verifiedAt: new Date()
          });
        }
        agent.isVerified = true;
        await agent.save();
      } else {
        await KYC.destroy({ where: { agentId: agent.id } });
        agent.isVerified = false;
        await agent.save();
      }
    }

    res.json({ message: 'User updated successfully.', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user.', error: error.message });
  }
});

// 3c. Delete User Account
app.delete('/api/admin/users/:id', adminAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    await user.destroy();
    res.json({ message: 'User account permanently deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting user.', error: error.message });
  }
});

// 4. Pending KYC Requests
app.get('/api/admin/kyc/pending', adminAuth, async (req, res) => {
  try {
    const requests = await KYC.findAll({
      include: [
        { 
          model: Agent, 
          as: 'agent',
          include: [
            { 
              model: User, 
              as: 'user', 
              attributes: ['fullName', 'email'],
              include: [{ model: Role, as: 'role', attributes: ['name'] }]
            }
          ]
        }
      ],
      order: [['submittedAt', 'DESC']]
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error loading KYC requests list.', error: error.message });
  }
});

// 5. Verify KYC Submission
app.post('/api/admin/kyc/verify', adminAuth, async (req, res) => {
  const { requestId, status, adminNotes } = req.body; // status: ACTIVE (approved) or REJECTED

  if (!['ACTIVE', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: 'Invalid verification decision.' });
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

    // Sync agent verification status
    agent.isVerified = (status === 'ACTIVE');
    await agent.save();

    // Set matching User status
    const user = await User.findByPk(agent.userId);
    if (user) {
      user.status = status === 'ACTIVE' ? 'ACTIVE' : 'REJECTED';
      await user.save();
    }

    res.json({ message: `Agent verification ${status.toLowerCase()} successfully.`, kyc });
  } catch (error) {
    res.status(500).json({ message: 'Error updating KYC verification.', error: error.message });
  }
});

// 6. Add land registry Titre Foncier
app.post('/api/admin/land-registry/add', adminAuth, async (req, res) => {
  const { titleNumber, ownerName, location, status, registeredAt, landArea, boundaries, caveatDetails } = req.body;

  try {
    const exists = await LandTitle.findOne({ where: { titleNumber } });
    if (exists) {
      return res.status(400).json({ message: 'This Land Title number is already registered.' });
    }

    const title = await LandTitle.create({
      titleNumber,
      ownerName,
      location: location || 'Bastos, Yaoundé',
      status: status || 'ACTIVE', // ACTIVE, INACTIVE, PENDING, REJECTED
      registeredAt: registeredAt || new Date().toISOString().split('T')[0],
      landArea: parseFloat(landArea || 500),
      boundaries: boundaries || 'North by neighboring plot, South by main street access road, East by brick wall compound, West by public walk path'
    });

    res.status(201).json({ message: 'New title record successfully added to MINDCAF database.', title });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to land registry.', error: error.message });
  }
});

// 6a. Get all registered titles
app.get('/api/admin/land-registry', adminAuth, async (req, res) => {
  try {
    const titles = await LandTitle.findAll({ order: [['id', 'DESC']] });
    res.json(titles);
  } catch (error) {
    res.status(500).json({ message: 'Error loading land registry.', error: error.message });
  }
});

// 6b. Update land title record
app.put('/api/admin/land-registry/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  const { titleNumber, ownerName, location, status, registeredAt, landArea, boundaries } = req.body;
  try {
    const title = await LandTitle.findByPk(id);
    if (!title) {
      return res.status(404).json({ message: 'Land title record not found.' });
    }

    title.titleNumber = titleNumber;
    title.ownerName = ownerName;
    title.location = location;
    title.status = status;
    title.registeredAt = registeredAt;
    if (landArea) title.landArea = parseFloat(landArea);
    if (boundaries) title.boundaries = boundaries;
    await title.save();

    res.json({ message: 'Land title successfully updated.', title });
  } catch (error) {
    res.status(500).json({ message: 'Error updating land title.', error: error.message });
  }
});

// 6c. Delete land title record
app.delete('/api/admin/land-registry/:id', adminAuth, async (req, res) => {
  const { id } = req.params;
  try {
    const title = await LandTitle.findByPk(id);
    if (!title) {
      return res.status(404).json({ message: 'Land title record not found.' });
    }
    await title.destroy();
    res.json({ message: 'Land title record permanently deleted from registry.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting land title.', error: error.message });
  }
});

// 7. Get Payments / Transactions List
app.get('/api/admin/payments', adminAuth, async (req, res) => {
  try {
    const payments = await Payment.findAll({
      include: [
        { model: User, as: 'user', attributes: ['fullName', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const mapped = payments.map(p => {
      const plain = p.get({ plain: true });
      plain.method = plain.paymentMethod === 'MTN_MOMO' ? 'Mobile money' : 'Orange money';
      plain.description = plain.paymentType === 'SUBSCRIPTION' 
        ? 'Agent monthly subscription' 
        : 'Listing promotion fee';
      return plain;
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Error loading payments list.', error: error.message });
  }
});

// 8. Update Payment Status
app.post('/api/admin/payments/update-status', adminAuth, async (req, res) => {
  const { paymentId, status } = req.body;
  if (!['SUCCESS', 'FAILED', 'PENDING'].includes(status)) {
    return res.status(400).json({ message: 'Invalid payment status.' });
  }

  try {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Payment record not found.' });
    }

    payment.status = status;
    await payment.save();

    res.json({ message: `Payment status successfully updated to ${status}.`, payment });
  } catch (error) {
    res.status(500).json({ message: 'Error updating payment status.', error: error.message });
  }
});

// 9. Block/Unblock User
app.post('/api/admin/users/:userId/block', adminAuth, async (req, res) => {
  const { userId } = req.params;
  const { block } = req.body; // true = block, false = unblock
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    user.status = block ? 'REJECTED' : 'ACTIVE';
    await user.save();
    res.json({ message: `User status successfully updated to ${user.status}.` });
  } catch (e) {
    res.status(500).json({ message: 'Error blocking user.', error: e.message });
  }
});

// 10. Delete User
app.delete('/api/admin/users/:userId', adminAuth, async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    await user.destroy();
    res.json({ message: 'User permanently deleted from database.' });
  } catch (e) {
    res.status(500).json({ message: 'Error deleting user.', error: e.message });
  }
});

// 10a. Create User
app.post('/api/admin/users', adminAuth, async (req, res) => {
  const { fullName, email, password, role } = req.body;
  try {
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password || 'conest123', salt);

    let roleRecord = await Role.findOne({ where: { name: role || 'BUYER' } });
    if (!roleRecord) {
      roleRecord = await Role.create({ name: role || 'BUYER' });
    }

    const user = await User.create({
      id: Math.floor(10000000 + Math.random() * 90000000),
      fullName,
      email,
      password: hashedPassword,
      rawPassword: password || 'conest123',
      status: 'ACTIVE',
      roleId: roleRecord.id
    });

    // Create matching profiles
    if (role === 'AGENT') {
      await Agent.create({ userId: user.id, isVerified: true });
    } else if (role === 'BUYER') {
      await Buyer.create({ userId: user.id });
    }

    res.status(201).json(user);
  } catch (e) {
    res.status(500).json({ message: 'Error creating user.', error: e.message });
  }
});

// 10b. Update User Details
app.put('/api/admin/users/:userId', adminAuth, async (req, res) => {
  const { userId } = req.params;
  const { fullName, email, role, cniNumber } = req.body;
  try {
    const user = await User.findByPk(userId, {
      include: [{ model: Agent, as: 'agentProfile' }]
    });
    if (!user) {
      return res.status(404).json({ message: 'User account not found.' });
    }

    let roleRecord = await Role.findOne({ where: { name: role || 'BUYER' } });
    if (!roleRecord) {
      roleRecord = await Role.create({ name: role || 'BUYER' });
    }

    user.fullName = fullName;
    user.email = email;
    user.roleId = roleRecord.id;
    await user.save();

    // Persist CNI to connected KYC tables
    if (cniNumber) {
      let agent = user.agentProfile;
      if (!agent) {
        agent = await Agent.create({ userId: user.id, isVerified: true });
      }
      let kyc = await KYC.findOne({ where: { agentId: agent.id } });
      if (!kyc) {
        await KYC.create({
          agentId: agent.id,
          idType: 'CNI',
          idNumber: cniNumber,
          idImage: 'pre_registered_cni_front.png',
          selfieImage: 'pre_registered_selfie.png',
          status: 'ACTIVE'
        });
      } else {
        kyc.idNumber = cniNumber;
        await kyc.save();
      }
    }

    res.json(user);
  } catch (e) {
    res.status(500).json({ message: 'Error updating user details.', error: e.message });
  }
});

// 10c. Create Property Listing
app.post('/api/admin/properties', adminAuth, async (req, res) => {
  const {
    title, description, price, city, neighborhood, landTitleNumber, propertyType,
    waterSource, waterSupply, electricity, roadType, roadAccess, estimatedMotoFare, proximityToMainStreet, securityLevel
  } = req.body;
  try {
    let agent = await Agent.findOne();
    if (!agent) {
      agent = await Agent.create({ userId: 1, isVerified: true });
    }

    const titleRecord = await LandTitle.findOne({ where: { titleNumber: landTitleNumber } });
    const landTitleId = titleRecord ? titleRecord.id : null;

    const property = await Property.create({
      agentId: agent.id,
      title,
      description,
      price: parseFloat(price),
      city,
      neighborhood,
      propertyType: propertyType || 'APARTMENT',
      status: 'ACTIVE',
      landTitleId
    });

    // Create CITI association
    await CITI.create({
      propertyId: property.id,
      neighborhood: neighborhood || 'Bastos',
      waterSource: waterSource || 'Borehole',
      waterSupply: parseInt(waterSupply || 4),
      electricity: parseInt(electricity || 4),
      roadType: roadType || 'Dirt',
      roadAccess: parseInt(roadAccess || 4),
      estimatedMotoFare: parseInt(estimatedMotoFare || 100),
      proximityToMainStreet: parseInt(proximityToMainStreet || 50),
      securityLevel: parseInt(securityLevel || 4)
    });

    res.status(201).json(property);
  } catch (e) {
    res.status(500).json({ message: 'Error creating listing.', error: e.message });
  }
});

// 10d. Update Property Listing
app.put('/api/admin/properties/:propertyId', adminAuth, async (req, res) => {
  const { propertyId } = req.params;
  const {
    title, description, price, city, neighborhood, landTitleNumber, propertyType,
    waterSource, waterSupply, electricity, roadType, roadAccess, estimatedMotoFare, proximityToMainStreet, securityLevel
  } = req.body;
  try {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property listing not found.' });
    }

    const titleRecord = await LandTitle.findOne({ where: { titleNumber: landTitleNumber } });
    const landTitleId = titleRecord ? titleRecord.id : null;

    property.title = title;
    property.description = description;
    property.price = parseFloat(price);
    property.city = city;
    property.neighborhood = neighborhood;
    property.propertyType = propertyType;
    property.landTitleId = landTitleId;
    await property.save();

    // Update associated CITI checklist
    let citi = await CITI.findOne({ where: { propertyId: property.id } });
    if (!citi) {
      citi = await CITI.create({ propertyId: property.id });
    }
    citi.waterSource = waterSource || citi.waterSource;
    citi.waterSupply = parseInt(waterSupply || citi.waterSupply);
    citi.electricity = parseInt(electricity || citi.electricity);
    citi.roadType = roadType || citi.roadType;
    citi.roadAccess = parseInt(roadAccess || citi.roadAccess);
    citi.estimatedMotoFare = parseInt(estimatedMotoFare || citi.estimatedMotoFare);
    citi.proximityToMainStreet = parseInt(proximityToMainStreet || citi.proximityToMainStreet);
    citi.securityLevel = parseInt(securityLevel || citi.securityLevel);
    await citi.save();

    res.json(property);
  } catch (e) {
    res.status(500).json({ message: 'Error updating listing.', error: e.message });
  }
});

// 11. Get Properties List (for admin moderation)
app.get('/api/admin/properties', adminAuth, async (req, res) => {
  try {
    const properties = await Property.findAll({
      include: [
        {
          model: Agent,
          as: 'agent',
          include: [{ model: User, as: 'user', attributes: ['fullName'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(properties);
  } catch (e) {
    res.status(500).json({ message: 'Error fetching properties list.', error: e.message });
  }
});

// 11a. Approve Property Listing
app.post('/api/admin/properties/:propertyId/approve', adminAuth, async (req, res) => {
  const { propertyId } = req.params;
  try {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property listing not found.' });
    }
    property.status = 'ACTIVE';
    await property.save();
    res.json({ message: 'Property listing approved successfully.', property });
  } catch (error) {
    res.status(500).json({ message: 'Error approving property.', error: error.message });
  }
});

// 11b. Reject Property Listing
app.post('/api/admin/properties/:propertyId/reject', adminAuth, async (req, res) => {
  const { propertyId } = req.params;
  try {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property listing not found.' });
    }
    property.status = 'REJECTED';
    await property.save();
    res.json({ message: 'Property listing rejected successfully.', property });
  } catch (error) {
    res.status(500).json({ message: 'Error rejecting property.', error: error.message });
  }
});

// 12. Delete Property Listing
app.delete('/api/admin/properties/:propertyId', adminAuth, async (req, res) => {
  const { propertyId } = req.params;
  try {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found.' });
    }
    await property.destroy();
    res.json({ message: 'Property listing permanently deleted.' });
  } catch (e) {
    res.status(500).json({ message: 'Error deleting property.', error: e.message });
  }
});

// 13. Get Conversations (for chat moderation)
app.get('/api/admin/chats', adminAuth, async (req, res) => {
  try {
    const chats = await Conversation.findAll({
      include: [
        {
          model: Buyer,
          as: 'buyer',
          include: [{ model: User, as: 'user', attributes: ['fullName'] }]
        },
        {
          model: Agent,
          as: 'agent',
          include: [{ model: User, as: 'user', attributes: ['fullName'] }]
        },
        {
          model: Property,
          as: 'property',
          attributes: ['title']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(chats);
  } catch (e) {
    res.status(500).json({ message: 'Error fetching chats list.', error: e.message });
  }
});

// 14. Delete Conversation Chat Channel
app.delete('/api/admin/chats/:chatId', adminAuth, async (req, res) => {
  const { chatId } = req.params;
  try {
    const chat = await Conversation.findByPk(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Conversation not found.' });
    }
    await chat.destroy();
    res.json({ message: 'Conversation successfully moderated and deleted.' });
  } catch (e) {
    res.status(500).json({ message: 'Error deleting conversation.', error: e.message });
  }
});

// 15. Get Messages List (for chat moderation)
app.get('/api/admin/messages', adminAuth, async (req, res) => {
  try {
    const { Message, User, Conversation, Buyer, Agent } = require('../backend/models');
    const messages = await Message.findAll({
      include: [
        { model: User, as: 'sender', attributes: ['id', 'fullName', 'email'] },
        { 
          model: Conversation, 
          as: 'conversation',
          include: [
            { model: Buyer, as: 'buyer', include: [{ model: User, as: 'user', attributes: ['fullName'] }] },
            { model: Agent, as: 'agent', include: [{ model: User, as: 'user', attributes: ['fullName'] }] }
          ]
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    const mapped = messages.map(m => {
      const plain = m.get({ plain: true });
      if (plain.conversation) {
        const buyerName = plain.conversation.buyer?.user?.fullName || 'Buyer';
        const agentName = plain.conversation.agent?.user?.fullName || 'Agent';
        const isSenderBuyer = plain.senderId === plain.conversation.buyer?.userId;
        plain.recipientName = isSenderBuyer ? agentName : buyerName;
      } else {
        plain.recipientName = 'Unknown';
      }
      return plain;
    });

    res.json(mapped);
  } catch (e) {
    res.status(500).json({ message: 'Error fetching messages list.', error: e.message });
  }
});

// 16. Delete Message
app.delete('/api/admin/messages/:messageId', adminAuth, async (req, res) => {
  const { messageId } = req.params;
  try {
    const { Message } = require('../backend/models');
    const msg = await Message.findByPk(messageId);
    if (!msg) {
      return res.status(404).json({ message: 'Message not found.' });
    }
    await msg.destroy();
    res.json({ message: 'Message successfully deleted by administrator.' });
  } catch (e) {
    res.status(500).json({ message: 'Error deleting message.', error: e.message });
  }
});

// 17. Get Reported Conversations List (for chat moderation)
app.get('/api/admin/reports', adminAuth, async (req, res) => {
  try {
    const { Report, User, Conversation, Buyer, Agent } = require('../backend/models');
    const reports = await Report.findAll({
      include: [
        { model: User, as: 'reporter', attributes: ['id', 'fullName', 'email'] },
        {
          model: Conversation,
          as: 'conversation',
          include: [
            { model: Buyer, as: 'buyer', include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'status'] }] },
            { model: Agent, as: 'agent', include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'status'] }] }
          ]
        }
      ],
      order: [['id', 'DESC']]
    });

    const mapped = reports.map(r => {
      const plain = r.get({ plain: true });
      let reportedUser = null;
      if (plain.conversation) {
        const buyerUser = plain.conversation.buyer?.user;
        const agentUser = plain.conversation.agent?.user;
        if (buyerUser && buyerUser.id === plain.reporterId) {
          reportedUser = agentUser;
        } else {
          reportedUser = buyerUser;
        }
      }
      plain.reportedUser = reportedUser;
      return plain;
    });

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Error loading reports.', error: error.message });
  }
});

// Serve frontend SPA for any other route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Co-Nest Admin Portal running on http://localhost:${PORT}`);
});
