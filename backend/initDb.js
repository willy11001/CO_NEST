const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const {
  sequelize,
  Role,
  User,
  Buyer,
  Renter,
  Agent,
  Administrator,
  Property,
  PropertyImage,
  CITI,
  LandTitle,
  KYC,
  Conversation,
  Message,
  Payment,
  Subscription,
  Promotion
} = require('./models');

// Helper to generate realistic Cameroonian names
const names = [
  'Elie Kamga', 'Fabiola Njoh', 'Jean-Pierre Fotso', 'Dieudonné Ndip', 'Marie Ngono',
  'Emmanuel Tchakounté', 'Grace Ebéné', 'Pierre Eteki', 'Rosine Wambo', 'Marc Atangana',
  'Josephine Ngu', 'Arthur Mbang', 'Florence Belinga', 'Salomon Youmbi', 'Serge Eto\'o',
  'Therese Bella', 'Lucien Mvondo', 'Victorine Song', 'Basile Foning', 'Colette Ndong',
  'Christian Kenfack', 'Alice Nkolo', 'Guy Djomo', 'Solange Ngassa', 'Raoul Ndam',
  'Marthe Salla', 'Valere Tsanga', 'Bernadette Kengne', 'Jules Tagne', 'Sabine Ngo',
  'Pascal Kamdem', 'Jeanne Ewane', 'Gaston Nzekou', 'Julienne Beyene', 'Nestor Tche',
  'Denise Mbia', 'Alphonse Kome', 'Angelique Mbede', 'Felix Ndjiki', 'Genevieve Masso',
  'Henri Nguidjol', 'Irene Penda', 'Charles Moudiki', 'Jacqueline Malla', 'Ferdinand Ndoumbe',
  'Sylvie Dikoume', 'Edouard Ekambi', 'Nathalie Ngom', 'Antoine Mbanga', 'Emilienne Tagne'
];

// Helper to generate realistic neighborhoods
const neighborhoods = {
  'Douala': ['Logpom', 'Bonapriso', 'Akwa', 'Bali', 'Kotto', 'Deido', 'Bonamoussadi'],
  'Yaoundé': ['Bastos', 'Odza', 'Mvan', 'Ngoa-Ekelle', 'Essos', 'Mendong', 'Biyem-Assi'],
  'Buea': ['Molyko', 'Great Soppo', 'Federal Quarters', 'Mile 16', 'Clerks Quarters'],
  'Kribi': ['Beachfront', 'Port Area', 'Mboa Manga', 'Talla', 'Bebambwé']
};

async function run() {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASS || '';
  const dbName = process.env.DB_NAME || 'conest_db';

  console.log(`Connecting to MySQL server at ${host}:${port} to check for database "${dbName}"...`);
  
  try {
    const connection = await mysql.createConnection({ host, port, user, password });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();
    console.log(`Database "${dbName}" checked/created successfully.`);
  } catch (error) {
    console.error('Failed to create database. Error:', error.message);
    process.exit(1);
  }

  try {
    console.log('Syncing database tables with Sequelize...');
    await sequelize.sync({ force: true });
    console.log('Database tables synchronized.');

    console.log('Seeding roles...');
    const rAdmin = await Role.create({ name: 'ADMIN' });
    const rAgent = await Role.create({ name: 'AGENT' });
    const rBuyer = await Role.create({ name: 'BUYER' });
    const rRenter = await Role.create({ name: 'RENTER' });

    console.log('Seeding default users...');
    const salt = await bcrypt.genSalt(10);
    const hashedAdminPassword = await bcrypt.hash('admin123', salt);
    const hashedAgentPassword = await bcrypt.hash('agent123', salt);
    const hashedBuyerPassword = await bcrypt.hash('buyer123', salt);

    const userAdmin = await User.create({
      id: 88712394,
      fullName: 'System Administrator',
      email: 'admin@conest.com',
      password: hashedAdminPassword,
      rawPassword: 'admin123',
      profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      status: 'ACTIVE',
      roleId: rAdmin.id
    });
    await Administrator.create({ userId: userAdmin.id });

    // 2. Agent
    const userAgent = await User.create({
      id: 88712395,
      fullName: 'Jean Pierre',
      email: 'agent@conest.com',
      password: hashedAgentPassword,
      rawPassword: 'agent123',
      profileImage: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
      status: 'ACTIVE',
      roleId: rAgent.id
    });
    const agentProfile = await Agent.create({
      userId: userAgent.id,
      agencyName: 'Bastos Prime Real Estate',
      agencyAddress: 'Rue de Bastos, Yaoundé',
      isVerified: true
    });

    await KYC.create({
      agentId: agentProfile.id,
      idType: 'CNI',
      idNumber: '1122334455',
      idImage: 'pre_registered_cni_front.png',
      backImage: 'pre_registered_cni_back.png',
      selfieImage: 'pre_registered_selfie.png',
      status: 'ACTIVE',
      submittedAt: new Date(),
      verifiedAt: new Date()
    });

    // 3. Buyer
    const userBuyer = await User.create({
      id: 88712396,
      fullName: 'Elie Kamga',
      email: 'buyer@conest.com',
      password: hashedBuyerPassword,
      rawPassword: 'buyer123',
      profileImage: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      status: 'ACTIVE',
      roleId: rBuyer.id
    });
    const buyerProfile = await Buyer.create({
      userId: userBuyer.id,
      preferredCity: 'Douala',
      preferredNeighborhood: 'Logpom'
    });

    console.log('Seeding 50 LandTitle records in simulated MINDCAF database...');
    const titles = [];

    // Prominent title 1: Active title for testing (Irene Penda)
    const tfIrene = await LandTitle.create({
      titleNumber: 'TF 1943/Mfoundi',
      ownerName: 'Irene Penda',
      location: 'Bastos, Yaoundé',
      status: 'ACTIVE',
      registeredAt: '2016-04-12',
      landArea: 750.00,
      boundaries: 'North by plot 1944, South by Bastos Main Boulevard, East by residential complex, West by public access pathway'
    });
    titles.push(tfIrene);

    // Prominent title 2: Disputed land in Logpom, Douala
    const tfDisputed = await LandTitle.create({
      titleNumber: 'TF 6720/Wouri',
      ownerName: 'Elie Kamga',
      location: 'Logpom, Douala',
      status: 'REJECTED', // Disputed warnings
      registeredAt: '2015-06-12',
      landArea: 1200.00,
      boundaries: 'North by plot 6721, South by public access road, East by Wouri river tributary, West by Logpom junction access lane'
    });
    titles.push(tfDisputed);

    // Prominent title 3: Active land in Molyko, Buea
    const tfActiveBuea = await LandTitle.create({
      titleNumber: 'TF 4432/Fako',
      ownerName: 'Fabiola Njoh',
      location: 'Molyko, Buea',
      status: 'ACTIVE',
      registeredAt: '2020-09-24',
      landArea: 600.00,
      boundaries: 'North by Molyko University High Street, South by plot 4433, East by compound walls, West by secondary dirt road'
    });
    titles.push(tfActiveBuea);

    // Generate 47 more realistic land titles
    const citiesList = ['Douala', 'Yaoundé', 'Buea', 'Kribi'];
    const divisionMapping = {
      'Douala': 'Wouri',
      'Yaoundé': 'Mfoundi',
      'Buea': 'Fako',
      'Kribi': 'Ocean'
    };

    for (let i = 4; i <= 50; i++) {
      const city = citiesList[i % citiesList.length];
      const division = divisionMapping[city];
      const neighborhoodList = neighborhoods[city];
      const neighborhood = neighborhoodList[i % neighborhoodList.length];
      const owner = names[i % names.length];
      const numCode = 5000 + i * 27;
      const titleNumber = `TF ${numCode}/${division}`;

      const title = await LandTitle.create({
        titleNumber,
        ownerName: owner,
        location: `${neighborhood}, ${city}`,
        status: 'ACTIVE',
        registeredAt: `2018-05-${String(1 + (i % 20)).padStart(2, '0')}`,
        landArea: parseFloat(300 + (i % 15) * 50),
        boundaries: `North by plot ${numCode + 1}, South by neighborhood access way, East by plot ${numCode - 1}, West by secondary access path`
      });
      titles.push(title);
    }
    console.log(`Generated ${titles.length} LandTitle records.`);

    console.log('Seeding 20 Property listings with CITI checklist ratings...');

    // Exactly 20 listings. 90% (18 out of 20) are linked to registered land titles.
    // Properties at index 0 and index 10 have landTitleId: null to simulate missing warnings.
    // Cameroonian house/land images used.
    const propertySamples = [
      {
        title: 'Spacious Apartment in Bonapriso (Shared Yard)',
        description: 'Clean residential apartment of 3 bedrooms, 2 bathrooms in Bonapriso. Private balcony, water flows 24/7 with borehole backup, security guard present.',
        propertyType: 'APARTMENT',
        price: 350000.00,
        city: 'Douala',
        neighborhood: 'Bonapriso',
        address: 'Rue de Bonapriso, Douala',
        landTitleIndex: 12, // Valid title index
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        citi: { waterSupply: 5, waterSource: 'Borehole', electricity: 5, roadAccess: 5, roadType: 'Tarred', security: 5, proximityToMainStreet: 10, estimatedMotoFare: 0 }
      },
      {
        title: 'Modern Student Studio in Molyko',
        description: 'Fully tiled student studio apartment located 5 minutes from UB junction. Safe and quiet environment, tailored for university students.',
        propertyType: 'STUDIO',
        price: 65000.00,
        city: 'Buea',
        neighborhood: 'Molyko',
        address: 'UB Road, Molyko, Buea',
        landTitleIndex: 2, // TF 4432/Fako (ACTIVE)
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800',
        citi: { waterSupply: 2, waterSource: 'Camwater only', electricity: 2, roadAccess: 2, roadType: 'Dirt', security: 3, proximityToMainStreet: 150, estimatedMotoFare: 150 }
      },
      {
        title: 'Executive Bastos Apartment (Borehole + Solar)',
        description: 'High-end apartment in high-security residential quarters of Bastos. Eneo grid with automatic solar battery backup system, secure gated parking, paved access.',
        propertyType: 'APARTMENT',
        price: 450000.00,
        city: 'Yaoundé',
        neighborhood: 'Bastos',
        address: 'Rue de Bastos, Yaoundé',
        landTitleIndex: 0, // TF 1943/Mfoundi (ACTIVE - Irene Penda)
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
        citi: { waterSupply: 5, waterSource: 'Borehole + Camwater', electricity: 5, roadAccess: 5, roadType: 'Tarred', security: 5, proximityToMainStreet: 20, estimatedMotoFare: 0 }
      },
      {
        title: 'Duplex Family House in Odza',
        description: 'Beautiful 4-bedroom family house with secure compound, tiled floors, private borehole, Eneo grid only (no backup generator).',
        propertyType: 'HOUSE',
        price: 250000.00,
        city: 'Yaoundé',
        neighborhood: 'Odza',
        address: 'Odza residential road, Yaoundé',
        landTitleIndex: 3, // ACTIVE
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800',
        citi: { waterSupply: 4, waterSource: 'Borehole', electricity: 3, roadAccess: 3, roadType: 'Dirt', security: 4, proximityToMainStreet: 120, estimatedMotoFare: 150 }
      },
      {
        title: 'Flat Building Land in Logpom, Wouri',
        description: 'Dry flat construction land of 600 sqm for sale inside Logpom. Perfect for erecting standard apartments or a private home.',
        propertyType: 'LAND',
        price: 30000000.00,
        city: 'Douala',
        neighborhood: 'Logpom',
        address: 'Logpom residential zone',
        landTitleIndex: 1, // TF 6720/Wouri (ACTIVE in terms of index lookup but marked Disputed REJECTED status)
        category: 'Sale',
        image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        citi: { waterSupply: 3, waterSource: 'Borehole', electricity: 2, roadAccess: 3, roadType: 'Dirt', security: 3, proximityToMainStreet: 80, estimatedMotoFare: 100 }
      },
      {
        title: 'Beautiful Gated House in Bonamoussadi',
        description: 'Standard Cameroonian duplex house for sale. Large compound, borehole water system, automatic generator backup.',
        propertyType: 'HOUSE',
        price: 110000000.00,
        city: 'Douala',
        neighborhood: 'Bonamoussadi',
        address: 'Bonamoussadi residential avenue',
        landTitleIndex: 4, // ACTIVE
        category: 'Sale',
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        citi: { waterSupply: 5, waterSource: 'Borehole', electricity: 5, roadAccess: 5, roadType: 'Tarred', security: 5, proximityToMainStreet: 25, estimatedMotoFare: 0 }
      },
      {
        title: 'Studio Room near NGOA-EKELLE campus',
        description: 'Simple student studio room for rent. Eneo electricity only (subject to load shedding), shared Camwater tap.',
        propertyType: 'STUDIO',
        price: 55000.00,
        city: 'Yaoundé',
        neighborhood: 'Ngoa-Ekelle',
        address: 'Ngoa-Ekelle university lane',
        landTitleIndex: 5, // ACTIVE
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800',
        citi: { waterSupply: 2, waterSource: 'Camwater only', electricity: 2, roadAccess: 4, roadType: 'Tarred', security: 2, proximityToMainStreet: 200, estimatedMotoFare: 150 }
      },
      {
        title: 'Beachfront House in Kribi for Rent',
        description: 'Vibrant beach villa with direct sand path access, Eneo solar backup, private borehole, fully furnished bedrooms.',
        propertyType: 'HOUSE',
        price: 500000.00,
        city: 'Kribi',
        neighborhood: 'Beachfront',
        address: 'Kribi Beach boulevard',
        landTitleIndex: 6, // ACTIVE
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
        citi: { waterSupply: 5, waterSource: 'Borehole', electricity: 4, roadAccess: 4, roadType: 'Dirt', security: 5, proximityToMainStreet: 40, estimatedMotoFare: 0 }
      },
      {
        title: 'Flat Land Plot in Mvan, Yaoundé',
        description: '1000 sqm construction land for sale, registered title reference with access to main electricity lines.',
        propertyType: 'LAND',
        price: 45000000.00,
        city: 'Yaoundé',
        neighborhood: 'Mvan',
        address: 'Mvan residential block',
        landTitleIndex: 7, // ACTIVE
        category: 'Sale',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
        citi: { waterSupply: 3, waterSource: 'Borehole', electricity: 3, roadAccess: 3, roadType: 'Dirt', security: 3, proximityToMainStreet: 150, estimatedMotoFare: 150 }
      },
      {
        title: 'Standard Apartment in Deido, Douala',
        description: 'Tiled apartment with 2 bedrooms, secure access gates, Eneo only grid, private Camwater tank.',
        propertyType: 'APARTMENT',
        price: 180000.00,
        city: 'Douala',
        neighborhood: 'Deido',
        address: 'Deido center block',
        landTitleIndex: 8, // ACTIVE
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
        citi: { waterSupply: 3, waterSource: 'Camwater only', electricity: 2, roadAccess: 5, roadType: 'Tarred', security: 3, proximityToMainStreet: 30, estimatedMotoFare: 0 }
      },
      {
        title: 'Fenced Plot of Land in Kribi Suburbs',
        description: '500 sqm building plot, dry land for sale. Fully fenced with concrete blocks.',
        propertyType: 'LAND',
        price: 15000000.00,
        city: 'Kribi',
        neighborhood: 'Talla',
        address: 'Talla lane, Kribi',
        landTitleIndex: 15, // Valid title index
        category: 'Sale',
        image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        citi: { waterSupply: 4, waterSource: 'Borehole', electricity: 2, roadAccess: 3, roadType: 'Dirt', security: 3, proximityToMainStreet: 200, estimatedMotoFare: 200 }
      },
      {
        title: 'Modern Studio Apartment in Kotto',
        description: 'Premium studio in Douala northern residential zone. Borehole water flows constantly, automatic generator backup.',
        propertyType: 'STUDIO',
        price: 90000.00,
        city: 'Douala',
        neighborhood: 'Kotto',
        address: 'Kotto lane, Douala',
        landTitleIndex: 9, // ACTIVE
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800',
        citi: { waterSupply: 5, waterSource: 'Borehole', electricity: 5, roadAccess: 4, roadType: 'Dirt', security: 4, proximityToMainStreet: 90, estimatedMotoFare: 100 }
      },
      {
        title: 'Duplex Villa in Bastos for Sale',
        description: 'Ultra-modern 5-bedroom villa for sale inside Bastos diplomatic district. Borehole water, automatic generator backup.',
        propertyType: 'HOUSE',
        price: 250000000.00,
        city: 'Yaoundé',
        neighborhood: 'Bastos',
        address: 'Bastos boulevard',
        landTitleIndex: 11, // ACTIVE
        category: 'Sale',
        image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800',
        citi: { waterSupply: 5, waterSource: 'Borehole', electricity: 5, roadAccess: 5, roadType: 'Tarred', security: 5, proximityToMainStreet: 15, estimatedMotoFare: 0 }
      },
      {
        title: 'Student Studio in Great Soppo, Buea',
        description: 'Cheap student single room studio, private toilet/bath. Borehole tap water, Eneo only electricity.',
        propertyType: 'STUDIO',
        price: 45000.00,
        city: 'Buea',
        neighborhood: 'Great Soppo',
        address: 'Great Soppo, Buea',
        landTitleIndex: 12, // ACTIVE
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800',
        citi: { waterSupply: 3, waterSource: 'Borehole', electricity: 2, roadAccess: 3, roadType: 'Dirt', security: 3, proximityToMainStreet: 180, estimatedMotoFare: 150 }
      },
      {
        title: 'Large Land Plot for Sale in Limbe',
        description: 'Half-hectare land with clear ocean view. Ready for immediate development.',
        propertyType: 'LAND',
        price: 35000000.00,
        city: 'Buea',
        neighborhood: 'Limbe Link',
        address: 'Limbe highway access',
        landTitleIndex: 13, // ACTIVE
        category: 'Sale',
        image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
        citi: { waterSupply: 4, waterSource: 'Borehole', electricity: 3, roadAccess: 4, roadType: 'Tarred', security: 4, proximityToMainStreet: 50, estimatedMotoFare: 100 }
      },
      {
        title: 'Comfortable House in Essos, Yaoundé',
        description: '3-bedroom secure home, private borehole, Eneo grid with manual generator backup.',
        propertyType: 'HOUSE',
        price: 200000.00,
        city: 'Yaoundé',
        neighborhood: 'Essos',
        address: 'Essos center road',
        landTitleIndex: 14, // ACTIVE
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800',
        citi: { waterSupply: 4, waterSource: 'Borehole', electricity: 4, roadAccess: 4, roadType: 'Dirt', security: 4, proximityToMainStreet: 100, estimatedMotoFare: 100 }
      },
      {
        title: 'Modern House in Bonamoussadi for Rent',
        description: 'Fenced family home inside Bonamoussadi. Eneo generator backup, water borehole installed.',
        propertyType: 'HOUSE',
        price: 400000.00,
        city: 'Douala',
        neighborhood: 'Bonamoussadi',
        address: 'Bonamoussadi block G',
        landTitleIndex: 15, // ACTIVE
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800',
        citi: { waterSupply: 5, waterSource: 'Borehole', electricity: 5, roadAccess: 5, roadType: 'Tarred', security: 4, proximityToMainStreet: 40, estimatedMotoFare: 0 }
      },
      {
        title: 'Agricultural Land Plot in Buea Mile 16',
        description: 'Flat fertile agricultural land plot, registered certificate reference.',
        propertyType: 'LAND',
        price: 14000000.00,
        city: 'Buea',
        neighborhood: 'Mile 16',
        address: 'Mile 16 farming grid',
        landTitleIndex: 16, // ACTIVE
        category: 'Sale',
        image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
        citi: { waterSupply: 4, waterSource: 'Borehole', electricity: 2, roadAccess: 3, roadType: 'Dirt', security: 3, proximityToMainStreet: 300, estimatedMotoFare: 200 }
      },
      {
        title: 'Apartment Suite inside Bali, Douala',
        description: 'Newly renovated apartment of 2 bedrooms. Safe area, Camwater tap system, Eneo only.',
        propertyType: 'APARTMENT',
        price: 220000.00,
        city: 'Douala',
        neighborhood: 'Bali',
        address: 'Bali commercial road',
        landTitleIndex: 17, // ACTIVE
        category: 'Rent',
        image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
        citi: { waterSupply: 3, waterSource: 'Camwater only', electricity: 2, roadAccess: 5, roadType: 'Tarred', security: 4, proximityToMainStreet: 20, estimatedMotoFare: 0 }
      },
       {
         title: 'Bungalow House for Sale in Kribi Coast',
         description: 'Stunning tourist coastal home for sale. Automatic solar grid installation, private borehole water system.',
         propertyType: 'HOUSE',
         price: 85000000.00,
         city: 'Kribi',
         neighborhood: 'Bebambwé',
         address: 'Bebambwé beach boulevard',
         landTitleIndex: 18, // ACTIVE
         category: 'Sale',
         image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
         citi: { waterSupply: 5, waterSource: 'Borehole', electricity: 5, roadAccess: 4, roadType: 'Dirt', security: 5, proximityToMainStreet: 60, estimatedMotoFare: 100 }
       },
       {
         title: 'Bastos Diplomatic Apartment',
         description: 'Luxurious 3-bedroom apartment situated inside Bastos diplomatic zone. Borehole backup water, solar energy storage panels, paved private road, round-the-clock secure entry guard.',
         propertyType: 'APARTMENT',
         price: 600000.00,
         city: 'Yaoundé',
         neighborhood: 'Bastos',
         address: 'Diplomatic Enclave, Bastos, Yaoundé',
         landTitleIndex: 20,
         category: 'Rent',
         image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
         citi: { waterSupply: 5, waterSource: 'Borehole + Camwater', electricity: 5, roadAccess: 5, roadType: 'Tarred', security: 5, proximityToMainStreet: 15, estimatedMotoFare: 0 }
       },
       {
         title: 'Logpom Private Fenced Villa',
         description: 'Spacious 4-bedroom villa with secure gated compound, dedicated borehole water pump, Eneo electric grid connection with manual backup generator.',
         propertyType: 'HOUSE',
         price: 75000000.00,
         city: 'Douala',
         neighborhood: 'Logpom',
         address: 'Logpom Rd, Douala',
         landTitleIndex: 21,
         category: 'Sale',
         image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800',
         citi: { waterSupply: 4, waterSource: 'Borehole', electricity: 4, roadAccess: 4, roadType: 'Dirt', security: 4, proximityToMainStreet: 45, estimatedMotoFare: 100 }
       },
       {
         title: 'Great Soppo Single Studio',
         description: 'Tiled single room student studio room. Shared laundry area, continuous borehole tap water supply, active Eneo grid connection.',
         propertyType: 'STUDIO',
         price: 40000.00,
         city: 'Buea',
         neighborhood: 'Great Soppo',
         address: 'Great Soppo, Buea',
         landTitleIndex: 22,
         category: 'Rent',
         image: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800',
         citi: { waterSupply: 3, waterSource: 'Borehole', electricity: 2, roadAccess: 3, roadType: 'Dirt', security: 3, proximityToMainStreet: 100, estimatedMotoFare: 100 }
       },
       {
         title: 'Kribi Coastal Ocean View Land',
         description: 'Premium beachfront building plot of 800 sqm for sale. Direct access to sandy beach, registered title reference with clean MINDCAF verification status.',
         propertyType: 'LAND',
         price: 40000000.00,
         city: 'Kribi',
         neighborhood: 'Beachfront',
         address: 'Kribi Beach boulevard',
         landTitleIndex: 23,
         category: 'Sale',
         image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
         citi: { waterSupply: 5, waterSource: 'Borehole', electricity: 4, roadAccess: 4, roadType: 'Dirt', security: 5, proximityToMainStreet: 20, estimatedMotoFare: 0 }
       },
       {
         title: 'Biyem-Assi Gated Family Home',
         description: 'Comfortable family residential home featuring 3 bedrooms, personal borehole water, Eneo electric grid setup.',
         propertyType: 'HOUSE',
         price: 180000.00,
         city: 'Yaoundé',
         neighborhood: 'Biyem-Assi',
         address: 'Biyem-Assi center road',
         landTitleIndex: 24,
         category: 'Rent',
         image: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800',
         citi: { waterSupply: 4, waterSource: 'Borehole', electricity: 3, roadAccess: 4, roadType: 'Tarred', security: 4, proximityToMainStreet: 80, estimatedMotoFare: 100 }
       },
       {
         title: 'Bonapriso Tiled Studio',
         description: 'Charming fully furnished studio room inside high-security Bonapriso block. private bathroom, constant Camwater water supply, Eneo with generator backup.',
         propertyType: 'STUDIO',
         price: 120000.00,
         city: 'Douala',
         neighborhood: 'Bonapriso',
         address: 'Rue de Bonapriso, Douala',
         landTitleIndex: 25,
         category: 'Rent',
         image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800',
         citi: { waterSupply: 4, waterSource: 'Camwater only', electricity: 4, roadAccess: 5, roadType: 'Tarred', security: 5, proximityToMainStreet: 20, estimatedMotoFare: 0 }
       },
       {
         title: 'Molyko High Street Office Land',
         description: 'Fenced commercial plot of 500 sqm for sale along Molyko high street. Ideal for offices, boutiques or retail shops.',
         propertyType: 'LAND',
         price: 55000000.00,
         city: 'Buea',
         neighborhood: 'Molyko',
         address: 'Molyko Street, Buea',
         landTitleIndex: 26,
         category: 'Sale',
         image: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800',
         citi: { waterSupply: 3, waterSource: 'Borehole', electricity: 2, roadAccess: 5, roadType: 'Tarred', security: 4, proximityToMainStreet: 10, estimatedMotoFare: 0 }
       },
       {
         title: 'Beachfront Tourist Bungalow',
         description: 'Cozy 2-bedroom bungalow ideal for vacation rentals or private coastal lodging. Solar electricity backup system and secure gated entry.',
         propertyType: 'HOUSE',
         price: 95000000.00,
         city: 'Kribi',
         neighborhood: 'Bebambwé',
         address: 'Bebambwé Coast Boulevard',
         landTitleIndex: 27,
         category: 'Sale',
         image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
         citi: { waterSupply: 5, waterSource: 'Borehole', electricity: 5, roadAccess: 4, roadType: 'Dirt', security: 5, proximityToMainStreet: 30, estimatedMotoFare: 0 }
       },
       {
         title: 'Odza Modern 3-Bedroom Apartment',
         description: 'Beautiful modern apartment in residential Odza complex. Private compound gate, water flows constantly from private borehole.',
         propertyType: 'APARTMENT',
         price: 240000.00,
         city: 'Yaoundé',
         neighborhood: 'Odza',
         address: 'Odza residential road',
         landTitleIndex: 28,
         category: 'Rent',
         image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
         citi: { waterSupply: 4, waterSource: 'Borehole', electricity: 3, roadAccess: 4, roadType: 'Dirt', security: 4, proximityToMainStreet: 90, estimatedMotoFare: 100 }
       },
       {
         title: 'Akwa Commercial Building Plot',
         description: 'Strategically located 600 sqm plot of building land in center Akwa commercial zone. Registered MINDCAF title reference.',
         propertyType: 'LAND',
         price: 120000000.00,
         city: 'Douala',
         neighborhood: 'Akwa',
         address: 'Akwa commercial boulevard',
         landTitleIndex: 29,
         category: 'Sale',
         image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
         citi: { waterSupply: 4, waterSource: 'Camwater only', electricity: 4, roadAccess: 5, roadType: 'Tarred', security: 4, proximityToMainStreet: 10, estimatedMotoFare: 0 }
       }
     ];

    for (let i = 0; i < propertySamples.length; i++) {
      const sample = propertySamples[i];
      
      let matchedTitleId = null;
      if (sample.landTitleIndex >= 0) {
        const matchedTitle = titles[sample.landTitleIndex] || titles[1];
        matchedTitleId = matchedTitle.id;
      }

      const property = await Property.create({
        agentId: agentProfile.id,
        title: sample.title,
        description: sample.description,
        propertyType: sample.propertyType,
        price: sample.price,
        city: sample.city,
        neighborhood: sample.neighborhood,
        address: sample.address,
        status: 'ACTIVE',
        category: sample.category, // Rent or Sale
        landTitleId: matchedTitleId
      });

      // Add image
      await PropertyImage.create({
        propertyId: property.id,
        imageUrl: sample.image,
        isMain: true
      });

      // Add CITI Index
      await CITI.create({
        propertyId: property.id,
        neighborhood: sample.neighborhood,
        waterSupply: sample.citi.waterSupply,
        waterSource: sample.citi.waterSource,
        electricity: sample.citi.electricity,
        roadAccess: sample.citi.roadAccess,
        roadType: sample.citi.roadType,
        security: sample.citi.security,
        proximityToMainStreet: sample.citi.proximityToMainStreet,
        estimatedMotoFare: sample.citi.estimatedMotoFare
        // overallScore calculated automatically on save hook
      });
    }

    console.log('Seeding Payment records for admin reconciliations...');
    const { Payment } = require('./models');
    await Payment.create({
      userId: userAgent.id,
      paymentType: 'SUBSCRIPTION',
      amount: 15000.00,
      paymentMethod: 'ORANGE_MONEY',
      phoneNumber: '699223344',
      transactionId: 'TXN-998811223',
      status: 'PENDING',
      paidAt: null
    });

    await Payment.create({
      userId: userAgent.id,
      paymentType: 'PROMOTION',
      amount: 25000.00,
      paymentMethod: 'MTN_MOMO',
      phoneNumber: '677112233',
      transactionId: 'TXN-554433221',
      status: 'SUCCESS',
      paidAt: new Date()
    });

    await Payment.create({
      userId: userAgent.id,
      paymentType: 'SUBSCRIPTION',
      amount: 15000.00,
      paymentMethod: 'ORANGE_MONEY',
      phoneNumber: '699001122',
      transactionId: 'TXN-887766554',
      status: 'SUCCESS',
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
    });

    await Payment.create({
      userId: userBuyer.id,
      paymentType: 'PROMOTION',
      amount: 10000.00,
      paymentMethod: 'MTN_MOMO',
      phoneNumber: '677009988',
      transactionId: 'TXN-112244668',
      status: 'FAILED',
      paidAt: null
    });

    console.log('Seeding completed successfully.');
    await sequelize.close();
  } catch (error) {
    console.error('Failed database initialization. Error:', error);
    process.exit(1);
  }
}

run();
