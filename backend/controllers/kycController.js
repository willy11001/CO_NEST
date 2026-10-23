const { KYC, User, Agent } = require('../models');

// Submit Agent KYC Verification Request
exports.submitKyc = async (req, res) => {
  const { idNumber, cniNumber, idImage, cniFrontImage, selfieImage, docFullName } = req.body;
  const actualIdNumber = idNumber || cniNumber;
  const actualIdImage = idImage || cniFrontImage;

  try {
    // 1. Fetch Agent Profile
    let agent = await Agent.findOne({ where: { userId: req.user.id } });
    if (!agent) {
      agent = await Agent.create({
        userId: req.user.id,
        agencyName: 'Buyer/Renter Verified Profile',
        agencyAddress: 'N/A',
        isVerified: false
      });
    }

    // Name alignment check (docFullName must match User.fullName to block identity spoofing)
    if (!docFullName || docFullName.trim().toLowerCase() !== req.user.fullName.trim().toLowerCase()) {
      return res.status(400).json({
        message: `KYC Denied: The full name on the CNI (${docFullName}) does not match your registered profile name (${req.user.fullName}). Under Cameroonian law, account names must match official government credentials.`
      });
    }

    // Check if there is already a pending or active KYC request
    const existingKyc = await KYC.findOne({ where: { agentId: agent.id } });
    if (existingKyc && (existingKyc.status === 'PENDING' || existingKyc.status === 'ACTIVE')) {
      return res.status(400).json({
        message: `You already have an identity verification request with status: ${existingKyc.status}.`
      });
    }

    // Create KYC entry
    const kyc = await KYC.create({
      agentId: agent.id,
      idType: 'CNI',
      idNumber: actualIdNumber,
      idImage: actualIdImage || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400',
      backImage: req.body.cniBackImage || req.body.backImage || 'https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400',
      selfieImage: selfieImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
      status: 'PENDING',
      submittedAt: new Date()
    });

    res.status(201).json({
      message: 'KYC identity documents submitted successfully. Verification pending admin review.',
      kyc
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during KYC submission.', error: error.message });
  }
};

// Check KYC Status
exports.getKycStatus = async (req, res) => {
  try {
    const agent = await Agent.findOne({ where: { userId: req.user.id } });
    if (!agent) {
      return res.json({
        isVerified: false,
        kycStatus: 'unverified',
        request: null
      });
    }

    const kyc = await KYC.findOne({
      where: { agentId: agent.id },
      order: [['submittedAt', 'DESC']]
    });

    let kycStatus = 'unverified';
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

    res.json({
      isVerified: agent.isVerified,
      kycStatus,
      request: kyc || null
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving KYC status.', error: error.message });
  }
};
