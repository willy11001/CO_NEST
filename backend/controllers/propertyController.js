const { Property, PropertyImage, CITI, User, Agent, Review, LandTitle, Subscription } = require('../models');
const { Op } = require('sequelize');

const savePropertyImages = async (propertyId, images) => {
  if (!images || images.length === 0) return [];

  const fs = require('fs');
  const path = require('path');

  const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const processedUrls = [];
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (img && img.startsWith('data:image')) {
      const matches = img.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const extension = matches[1].split('/')[1] || 'jpg';
        const buffer = Buffer.from(matches[2], 'base64');
        const filename = `property-${propertyId}-${i}-${Date.now()}.${extension}`;
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, buffer);
        processedUrls.push(`/uploads/${filename}`);
      } else {
        processedUrls.push(img);
      }
    } else {
      processedUrls.push(img);
    }
  }

  return processedUrls;
};

// Publish property
exports.publishListing = async (req, res) => {
  const {
    title,
    description,
    category, // Rent or Sale
    propertyType, // HOUSE, APARTMENT, LAND, STUDIO, COMMERCIAL
    price,
    city,
    neighborhood,
    address,
    landTitleNumber,
    images, // Array of URLs
    // CITI metrics
    waterSupply,
    waterSource,
    electricity,
    roadAccess,
    roadType,
    security,
    proximityToMainStreet,
    estimatedMotoFare
  } = req.body;

  if (category === 'Sale' && !landTitleNumber) {
    return res.status(400).json({ message: 'Error: Land Title reference number is mandatory for sales listings.' });
  }

  try {
    // 1. Fetch Agent Profile
    const agent = await Agent.findOne({ where: { userId: req.user.id } });
    if (!agent) {
      return res.status(403).json({ message: 'Only registered real estate agents can publish properties.' });
    }

    if (!agent.isVerified) {
      return res.status(403).json({ message: 'KYC Blocked: You must be verified by admin before publishing properties.' });
    }

    // 1b. Check listings limit (maximum 10 free listings per agent)
    const publishedCount = await Property.count({ where: { agentId: agent.id } });
    if (publishedCount >= 10) {
      const activeSub = await Subscription.findOne({
        where: {
          userId: req.user.id,
          status: 'ACTIVE',
          endDate: { [Op.gt]: new Date() }
        }
      });
      if (!activeSub) {
        return res.status(403).json({
          message: 'Subscription Required: You have reached the maximum free limit of 10 listings. Please purchase a subscription plan under the payments tab to publish more properties.'
        });
      }
    }

    // 2. Find or create Land Title if provided
    let landTitleId = null;
    if (landTitleNumber) {
      let titleRecord = await LandTitle.findOne({ where: { titleNumber: landTitleNumber } });
      if (!titleRecord) {
        titleRecord = await LandTitle.create({
          titleNumber: landTitleNumber,
          ownerName: req.user.fullName || 'Declaring Agent',
          status: 'Active',
          landArea: 500,
          boundaries: 'N/A'
        });
      }
      landTitleId = titleRecord.id;
    }

    // 3. Create property listing
    const property = await Property.create({
      agentId: agent.id,
      title,
      description,
      category: category || 'Rent',
      propertyType: (propertyType || 'APARTMENT').toUpperCase(),
      price,
      city,
      neighborhood,
      address: address || null,
      status: 'ACTIVE',
      landTitleId
    });

    // 4. Create images
    if (images && images.length > 0) {
      const processedImages = await savePropertyImages(property.id, images);
      const imgRecords = processedImages.map((url, index) => ({
        propertyId: property.id,
        imageUrl: url,
        isMain: index === 0
      }));
      await PropertyImage.bulkCreate(imgRecords);
    } else {
      await PropertyImage.create({
        propertyId: property.id,
        imageUrl: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
        isMain: true
      });
    }

    // 5. Create CITI entry
    await CITI.create({
      propertyId: property.id,
      neighborhood: neighborhood || property.neighborhood,
      waterSupply: parseInt(waterSupply || 3),
      waterSource: waterSource || 'Borehole',
      electricity: parseInt(electricity || 3),
      roadAccess: parseInt(roadAccess || 3),
      roadType: roadType || 'Dirt',
      security: parseInt(security || 3),
      proximityToMainStreet: parseInt(proximityToMainStreet || 100),
      estimatedMotoFare: parseInt(estimatedMotoFare || 150)
    });

    // Fetch and return the fully populated listing
    const fullListing = await Property.findByPk(property.id, {
      include: [
        { model: PropertyImage, as: 'images' },
        { model: CITI, as: 'citiIndex' },
        { model: LandTitle, as: 'landTitle' }
      ]
    });

    res.status(201).json({
      message: 'Listing published successfully.',
      property: fullListing
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error publishing property.', error: error.message });
  }
};

// Search & Filter Properties
exports.getListings = async (req, res) => {
  const {
    category,
    propertyType,
    city,
    neighborhood,
    minPrice,
    maxPrice,
    search
  } = req.query;

  try {
    const whereClause = { status: 'ACTIVE' };

    if (category) {
      whereClause.category = category;
    }
    if (propertyType) {
      whereClause.propertyType = propertyType.toUpperCase();
    }
    if (city) {
      whereClause.city = city;
    }
    if (neighborhood) {
      whereClause.neighborhood = neighborhood;
    }

    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) whereClause.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereClause.price[Op.lte] = parseFloat(maxPrice);
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const listings = await Property.findAll({
      where: whereClause,
      include: [
        { model: PropertyImage, as: 'images' },
        { model: CITI, as: 'citiIndex' },
        { model: LandTitle, as: 'landTitle' },
        { 
          model: Agent, 
          as: 'agent',
          required: true,
          include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'profileImage'] }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    const responseData = listings.map(l => {
      const plain = l.get({ plain: true });
      if (plain.landTitle) {
        plain.landTitleNumber = plain.landTitle.titleNumber;
      }
      return plain;
    });

    res.json(responseData);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching listings.', error: error.message });
  }
};

// Get Listing By ID
exports.getListingById = async (req, res) => {
  try {
    const listing = await Property.findByPk(req.params.id, {
      include: [
        { model: PropertyImage, as: 'images' },
        { model: CITI, as: 'citiIndex' },
        { model: LandTitle, as: 'landTitle' },
        { 
          model: Agent, 
          as: 'agent',
          include: [{ model: User, as: 'user', attributes: ['id', 'fullName', 'email', 'profileImage'] }]
        },
        {
          model: Review,
          as: 'reviews',
          include: [{ model: User, as: 'user', attributes: ['fullName'] }]
        }
      ]
    });

    if (!listing) {
      return res.status(404).json({ message: 'Property listing not found.' });
    }

    const plain = listing.get({ plain: true });
    if (plain.landTitle) {
      plain.landTitleNumber = plain.landTitle.titleNumber;
    }

    res.json(plain);
  } catch (error) {
    res.status(500).json({ message: 'Server error retrieving listing details.', error: error.message });
  }
};

// Update Property
exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description,
    category,
    propertyType,
    price,
    city,
    neighborhood,
    address,
    landTitleNumber,
    images,
    waterSource,
    waterSupply,
    electricity,
    roadType,
    roadAccess,
    security,
    proximityToMainStreet,
    estimatedMotoFare
  } = req.body;

  try {
    const property = await Property.findByPk(id, {
      include: [
        { model: PropertyImage, as: 'images' },
        { model: CITI, as: 'citiIndex' }
      ]
    });

    if (!property) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    // Check if requester is owner agent or admin
    const agent = await Agent.findOne({ where: { userId: req.user.id } });
    const isOwner = agent && property.agentId === agent.id;
    const isAdmin = req.user.role && req.user.role.name === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: Unauthorized action.' });
    }

    let landTitleId = property.landTitleId;
    if (landTitleNumber) {
      const matchTitle = await LandTitle.findOne({ where: { titleNumber: landTitleNumber } });
      if (matchTitle) {
        landTitleId = matchTitle.id;
      } else {
        const newTitle = await LandTitle.create({
          titleNumber: landTitleNumber,
          ownerName: req.user.fullName,
          status: 'Active',
          landArea: 500,
          boundaries: 'N/A'
        });
        landTitleId = newTitle.id;
      }
    }

    // Update Property
    await property.update({
      title,
      description,
      category: category || property.category,
      propertyType: propertyType ? propertyType.toUpperCase() : property.propertyType,
      price: price ? parseFloat(price) : property.price,
      city: city || property.city,
      neighborhood: neighborhood || property.neighborhood,
      address: address || property.address,
      landTitleId
    });

    // Update Images
    if (images && images.length > 0) {
      await PropertyImage.destroy({ where: { propertyId: property.id } });
      const processedImages = await savePropertyImages(property.id, images);
      const imgRecords = processedImages.map((url, index) => ({
        propertyId: property.id,
        imageUrl: url,
        isMain: index === 0
      }));
      await PropertyImage.bulkCreate(imgRecords);
    }

    // Update CITI
    if (property.citiIndex) {
      await property.citiIndex.update({
        waterSource: waterSource || property.citiIndex.waterSource,
        waterSupply: waterSupply !== undefined ? parseInt(waterSupply) : property.citiIndex.waterSupply,
        electricity: electricity !== undefined ? parseInt(electricity) : property.citiIndex.electricity,
        roadType: roadType || property.citiIndex.roadType,
        roadAccess: roadAccess !== undefined ? parseInt(roadAccess) : property.citiIndex.roadAccess,
        security: security !== undefined ? parseInt(security) : property.citiIndex.security,
        proximityToMainStreet: proximityToMainStreet !== undefined ? parseInt(proximityToMainStreet) : property.citiIndex.proximityToMainStreet,
        estimatedMotoFare: estimatedMotoFare !== undefined ? parseInt(estimatedMotoFare) : property.citiIndex.estimatedMotoFare
      });
    } else {
      await CITI.create({
        propertyId: property.id,
        waterSource: waterSource || 'Borehole',
        waterSupply: waterSupply !== undefined ? parseInt(waterSupply) : 4,
        electricity: electricity !== undefined ? parseInt(electricity) : 4,
        roadType: roadType || 'Tarred',
        roadAccess: roadAccess !== undefined ? parseInt(roadAccess) : 4,
        security: security !== undefined ? parseInt(security) : 4,
        proximityToMainStreet: proximityToMainStreet !== undefined ? parseInt(proximityToMainStreet) : 50,
        estimatedMotoFare: estimatedMotoFare !== undefined ? parseInt(estimatedMotoFare) : 100
      });
    }

    res.json({ message: 'Listing updated successfully.', property });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating listing.', error: error.message });
  }
};

// Delete Property
exports.deleteListing = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    // Check if requester is owner agent or admin
    const agent = await Agent.findOne({ where: { userId: req.user.id } });
    const isOwner = agent && property.agentId === agent.id;
    const isAdmin = req.user.role && req.user.role.name === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Access denied: Unauthorized action.' });
    }

    await property.destroy();
    res.json({ message: 'Listing deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting listing.', error: error.message });
  }
};

// Submit Review
exports.submitReview = async (req, res) => {
  const { rating, comment } = req.body;
  const propertyId = req.params.id;

  try {
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property listing not found.' });
    }

    const review = await Review.create({
      userId: req.user.id,
      propertyId: parseInt(propertyId),
      rating: parseInt(rating || 3),
      comment
    });

    res.status(201).json({
      message: 'Review submitted successfully.',
      review
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error submitting review.', error: error.message });
  }
};

// Submit Renter CITI Rating
exports.submitCitiRating = async (req, res) => {
  const { water, electricity, road, security } = req.body;
  const propertyId = req.params.id;

  try {
    const property = await Property.findByPk(propertyId, {
      include: [{ model: CITI, as: 'citiIndex' }]
    });

    if (!property) {
      return res.status(404).json({ message: 'Property listing not found.' });
    }

    if (property.category !== 'Rent') {
      return res.status(400).json({ message: 'Community ratings are only enabled for rent listings.' });
    }

    if (!property.citiIndex) {
      return res.status(404).json({ message: 'CITI record not found for this property.' });
    }

    const newWater = Math.round((property.citiIndex.waterSupply + parseInt(water || 4)) / 2);
    const newElectricity = Math.round((property.citiIndex.electricity + parseInt(electricity || 4)) / 2);
    const newRoad = Math.round((property.citiIndex.roadAccess + parseInt(road || 4)) / 2);
    const newSecurity = Math.round((property.citiIndex.security + parseInt(security || 4)) / 2);

    await property.citiIndex.update({
      waterSupply: newWater,
      electricity: newElectricity,
      roadAccess: newRoad,
      security: newSecurity
    });

    res.json({
      message: 'CITI community rating registered and overall index recalculated successfully.',
      citiIndex: property.citiIndex
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating CITI ratings.', error: error.message });
  }
};
