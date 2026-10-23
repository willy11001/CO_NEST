const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { User, Role, OTP, Buyer, Renter, Agent, Administrator, KYC } = require('../models');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'conest_super_secret_jwt_key_2026_cameroon';
const JWT_EXPIRE = process.env.JWT_EXPIRE || '30d';

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Register
exports.register = async (req, res) => {
  const { fullName, email, phone, password, role, cniNumber } = req.body;

  try {
    // Check if user exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Normalize role to UPPERCASE
    const normalizedRole = (role || 'BUYER').toUpperCase();
    
    // Find role in Database
    let userRole = await Role.findOne({ where: { name: normalizedRole } });
    if (!userRole) {
      // Seed dynamically if roles table was force synced empty
      const roles = ['ADMIN', 'AGENT', 'BUYER', 'RENTER'];
      for (const r of roles) {
        await Role.findOrCreate({ where: { name: r }, defaults: { name: r } });
      }
      userRole = await Role.findOne({ where: { name: normalizedRole } });
      if (!userRole) {
        return res.status(400).json({ message: 'Invalid role specified.' });
      }
    }

    // Create user
    const user = await User.create({
      id: Math.floor(10000000 + Math.random() * 90000000),
      fullName,
      email,
      phone: phone || null,
      password: hashedPassword,
      rawPassword: password,
      status: 'ACTIVE',
      roleId: userRole.id
    });

    // Create specialized role profile
    if (normalizedRole === 'BUYER') {
      await Buyer.create({ userId: user.id });
    } else if (normalizedRole === 'RENTER') {
      await Renter.create({ userId: user.id });
    } else if (normalizedRole === 'AGENT') {
      const agent = await Agent.create({
        userId: user.id,
        agencyName: req.body.agencyName || '',
        agencyAddress: req.body.agencyAddress || '',
        isVerified: false
      });
      if (cniNumber) {
        await KYC.create({
          agentId: agent.id,
          idType: 'CNI',
          idNumber: cniNumber,
          idImage: 'pre_registered_cni_front.png',
          selfieImage: 'pre_registered_selfie.png',
          status: 'PENDING'
        });
      }
    } else if (normalizedRole === 'ADMIN') {
      await Administrator.create({ userId: user.id });
    }

    const token = generateToken(user.id);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: normalizedRole,
        status: user.status,
        kycStatus: 'unverified'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const { Role, Agent, KYC } = require('../models');
    const user = await User.findOne({ 
      where: { email },
      include: [
        { model: Role, as: 'role' },
        {
          model: Agent,
          as: 'agentProfile',
          include: [{ model: KYC, as: 'kycDetails' }]
        }
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const userRoleName = user.role ? user.role.name : 'BUYER';
    const token = generateToken(user.id);

    let kycStatus = 'unverified';
    const agent = user.agentProfile;
    if (agent) {
      const kyc = agent.kycDetails;
      if (agent.isVerified) {
        kycStatus = 'verified';
      } else if (kyc) {
        if (kyc.status === 'PENDING') {
          kycStatus = 'pending';
        } else if (kyc.status === 'REJECTED') {
          kycStatus = 'rejected';
        } else if (kyc.status === 'ACTIVE') {
          kycStatus = 'verified';
        }
      }
    }

    res.json({
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: userRoleName,
        status: user.status,
        profileImage: user.profileImage,
        kycStatus: kycStatus
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
};

// Forgot Password (SMTP with nodemailer)
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'No user registered with this email.' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins expiry

    // Delete any old OTPs for this email
    await OTP.destroy({ where: { email } });

    // Save new OTP using complies model
    await OTP.create({ 
      userId: user.id,
      email, 
      code: otpCode, 
      purpose: 'PASSWORD_RESET',
      expiresAt,
      isUsed: false
    });

    // Setup SMTP transporter using Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || ''
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: process.env.SMTP_FROM || '"Co-Nest Support" <noreply@conest.com>',
      to: email,
      subject: 'Co-Nest Password Reset OTP',
      text: `Hello, \n\nYou requested a password reset on Co-Nest. \n\nYour OTP verification code is: ${otpCode}\n\nThis code will expire in 15 minutes.\n\nBest regards,\nThe Co-Nest Team`,
      html: `<div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #2563eb; border-radius: 8px;">
        <h2 style="color: #1d4ed8;">Co-Nest Trust Ecosystem</h2>
        <p>Hello,</p>
        <p>You requested a password reset on <strong>Co-Nest</strong> (Cameroonian Real Estate Trust App).</p>
        <p>Your OTP verification code is:</p>
        <div style="background-color: #f1f5f9; padding: 12px; font-size: 24px; font-weight: bold; text-align: center; border-radius: 6px; letter-spacing: 4px; color: #0f172a; border: 1px solid #cbd5e1; margin: 20px 0;">
          ${otpCode}
        </div>
        <p style="color: #64748b; font-size: 12px;">This code will expire in 15 minutes. If you did not request this, please ignore this email.</p>
      </div>`
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`[SMTP Email Nodemailer] Sent OTP email to ${email}`);
      res.json({ message: 'OTP verification email sent via SMTP successfully.' });
    } catch (mailError) {
      console.warn(`[SMTP Email Warning] Failed to send email via SMTP: ${mailError.message}. Logging code locally: OTP is ${otpCode}`);
      res.json({ 
        message: 'OTP generated successfully (SMTP send failed, check credentials, OTP printed in server logs).', 
        debugOtp: otpCode
      });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during forgot password process.', error: error.message });
  }
};

// Verify OTP
exports.verifyOtp = async (req, res) => {
  const { email, otpCode } = req.body;

  try {
    const record = await OTP.findOne({ 
      where: { 
        email, 
        code: otpCode,
        isUsed: false
      } 
    });

    if (!record) {
      return res.status(400).json({ message: 'Invalid OTP code.' });
    }

    if (new Date() > record.expiresAt) {
      return res.status(400).json({ message: 'OTP code has expired.' });
    }

    res.json({ message: 'OTP verified successfully.', verified: true });
  } catch (error) {
    res.status(500).json({ message: 'Server error during OTP verification.', error: error.message });
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const { email, otpCode, newPassword } = req.body;

  try {
    const record = await OTP.findOne({ 
      where: { 
        email, 
        code: otpCode,
        isUsed: false
      } 
    });

    if (!record) {
      return res.status(400).json({ message: 'Unauthorized password reset.' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    await user.save();

    // Mark OTP as used
    record.isUsed = true;
    await record.save();

    res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during password reset.', error: error.message });
  }
};

// Get Profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role' },
        { model: Buyer, as: 'buyerProfile' },
        { model: Renter, as: 'renterProfile' },
        { model: Agent, as: 'agentProfile' }
      ]
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile.', error: error.message });
  }
};

// Update Profile
exports.updateProfile = async (req, res) => {
  const { fullName, email, phone, agencyName, agencyAddress, profileImage } = req.body;

  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        { model: Role, as: 'role' },
        { model: Agent, as: 'agentProfile' }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userRoleName = user.role ? user.role.name : '';

    // Safety lock: Name and Email are strictly locked once created for Co-Nest security guidelines
    if (fullName && fullName !== user.fullName) {
      return res.status(400).json({
        message: 'Security Alert: Co-Nest locks profile names after account creation for security and trust verification reasons.'
      });
    }

    if (email && email !== user.email) {
      return res.status(400).json({
        message: 'Security Alert: Co-Nest locks registered emails after account creation for security reasons.'
      });
    }

    if (phone) user.phone = phone;
    if (profileImage !== undefined) {
      if (profileImage && profileImage.startsWith('data:image')) {
        const fs = require('fs');
        const path = require('path');
        const matches = profileImage.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (matches && matches.length === 3) {
          const extension = matches[1].split('/')[1] || 'jpg';
          const buffer = Buffer.from(matches[2], 'base64');
          
          const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          const filename = `avatar-${user.id}-${Date.now()}.${extension}`;
          const filepath = path.join(uploadDir, filename);
          fs.writeFileSync(filepath, buffer);
          
          user.profileImage = `/uploads/${filename}`;
        } else {
          user.profileImage = profileImage;
        }
      } else {
        user.profileImage = profileImage;
      }
    }

    await user.save();

    // Update specialized details
    if (userRoleName === 'AGENT' && user.agentProfile) {
      if (agencyName !== undefined) user.agentProfile.agencyName = agencyName;
      if (agencyAddress !== undefined) user.agentProfile.agencyAddress = agencyAddress;
      await user.agentProfile.save();
    }

    // Refresh and return
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Role, as: 'role' },
        { model: Agent, as: 'agentProfile' }
      ]
    });

    res.json({
      message: 'Profile updated successfully.',
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role ? updatedUser.role.name : 'BUYER',
        status: updatedUser.status,
        profileImage: updatedUser.profileImage,
        agentProfile: updatedUser.agentProfile
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating profile.', error: error.message });
  }
};
