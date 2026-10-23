const { Payment, Subscription, Promotion, Property } = require('../models');

// Initiate and process MTN MoMo / Orange Money Payment
exports.processPayment = async (req, res) => {
  const { amount, paymentMethod, paymentType, propertyId, planType, phoneNumber } = req.body;
  const userId = req.user.id;

  try {
    let normalizedMethod = paymentMethod.toUpperCase().replace(/\s+/g, '_');
    if (normalizedMethod.includes('MTN')) {
      normalizedMethod = 'MTN_MOMO';
    } else if (normalizedMethod.includes('ORANGE')) {
      normalizedMethod = 'ORANGE_MONEY';
    }
    const normalizedType = paymentType ? paymentType.toUpperCase() : 'SUBSCRIPTION';

    if (!amount || !paymentMethod) {
      return res.status(400).json({ message: 'Missing payment parameters.' });
    }

    // Only validate phone for Mobile Money carriers
    if (normalizedMethod.includes('MTN') || normalizedMethod.includes('ORANGE') || normalizedMethod.includes('MOMO')) {
      if (!phoneNumber) {
        return res.status(400).json({ message: 'Phone number is required for mobile money carriers.' });
      }
      const cleanPhone = phoneNumber.replace(/\s+/g, '');
      if (!/^(237)?6[256789]\d{7}$/.test(cleanPhone)) {
        return res.status(400).json({ message: 'Invalid Cameroonian telephone number. Must start with 6 followed by 8 digits.' });
      }
      console.log(`[MoMo Trigger] Dispatching USSD request to ${phoneNumber} via ${paymentMethod} for ${amount} FCFA...`);
    } else {
      console.log(`[Bank Transfer Trigger] Processing bank wire transaction for ${amount} FCFA...`);
    }

    // Generate transaction reference
    let carrier = 'BANK';
    if (normalizedMethod.includes('MTN')) carrier = 'MTN';
    else if (normalizedMethod.includes('ORANGE')) carrier = 'ORANGE';
    const transactionId = `TXN-${carrier}-${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Create payment record (directly marked SUCCESS for demo simulation)
    const payment = await Payment.create({
      userId,
      paymentType: normalizedType,
      amount,
      paymentMethod: normalizedMethod,
      phoneNumber: phoneNumber ? phoneNumber.trim() : null,
      transactionId,
      status: 'SUCCESS',
      paidAt: new Date()
    });

    let extraDetails = {};

    if (normalizedType === 'SUBSCRIPTION') {
      const durationDays = 30;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + durationDays);

      const sub = await Subscription.create({
        userId,
        planType: (planType || 'SILVER').toUpperCase(),
        startDate: new Date(),
        endDate,
        status: 'ACTIVE'
      });
      extraDetails = { subscription: sub };

    } else if (normalizedType === 'PROMOTION') {
      if (!propertyId) {
        return res.status(400).json({ message: 'Property ID is required for listing promotion.' });
      }

      const property = await Property.findByPk(propertyId);
      if (!property) {
        return res.status(404).json({ message: 'Property listing not found.' });
      }

      const promoEndDate = new Date();
      promoEndDate.setDate(promoEndDate.getDate() + 7); // Boost for 7 days

      const promo = await Promotion.create({
        propertyId,
        price: amount,
        startDate: new Date(),
        endDate: promoEndDate,
        status: 'ACTIVE'
      });
      extraDetails = { promotion: promo };
    }

    res.status(201).json({
      message: `${paymentMethod} payment completed successfully (simulated USSD approved).`,
      payment,
      ...extraDetails
    });

  } catch (error) {
    res.status(500).json({ message: 'Server error processing payment.', error: error.message });
  }
};

// Retrieve payment history
exports.getTransactions = async (req, res) => {
  try {
    const payments = await Payment.findAll({
      where: { userId: req.user.id },
      order: [['paidAt', 'DESC']]
    });
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: 'Server error loading transaction history.', error: error.message });
  }
};
