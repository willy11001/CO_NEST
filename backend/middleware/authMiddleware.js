const jwt = require('jsonwebtoken');
const { User, Role } = require('../models');
require('dotenv').config();

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided, authorization denied.' });
  }

  const token = authHeader.replace(/^Bearer\s+(Bearer\s+)?/i, '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'conest_super_secret_jwt_key_2026_cameroon');
    
    // Fetch user and include their role
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role', attributes: ['name'] }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Token is not valid, user not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token is not valid.' });
  }
};
