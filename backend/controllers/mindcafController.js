const { LandTitle } = require('../models');

// Verify Land Title (Titre Foncier)
exports.verifyTitle = async (req, res) => {
  const { titleNumber } = req.body;

  if (!titleNumber) {
    return res.status(400).json({ message: 'Land title number (Titre Foncier) is required.' });
  }

  try {
    const cleanTitle = titleNumber.trim();
    const titleRecord = await LandTitle.findOne({ where: { titleNumber: cleanTitle } });

    if (!titleRecord) {
      return res.status(200).json({
        verified: false,
        status: 'REJECTED',
        titleNumber: cleanTitle,
        warningDetail: 'SCAM WARNING: This land title registry number does NOT exist in the official MINDCAF database. Transacting on this listing carries high risk of double allocation or fraud.'
      });
    }

    // Return registry information
    let warningCaveats = null;
    let message = 'Title records matched and active.';

    if (titleRecord.status === 'REJECTED') {
      warningCaveats = 'This title is subject to family inheritance litigation. A caveat has been placed on this land registry entry by the High Court.';
      message = 'LITIGATION WARNING: This title is flagged. Read caveats carefully before payment.';
    } else if (titleRecord.status === 'INACTIVE') {
      warningCaveats = 'This title has been suspended or marked inactive due to missing documentation.';
      message = 'SUSPENDED WARNING: This land title is inactive in the official registry.';
    }

    res.json({
      verified: titleRecord.status === 'ACTIVE',
      titleNumber: titleRecord.titleNumber,
      ownerName: titleRecord.ownerName,
      location: titleRecord.location,
      status: titleRecord.status, // ACTIVE, INACTIVE, PENDING, REJECTED
      warningCaveats,
      registeredAt: titleRecord.registeredAt,
      landArea: titleRecord.landArea,
      boundaries: titleRecord.boundaries,
      message
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error querying MINDCAF registry.', error: error.message });
  }
};
