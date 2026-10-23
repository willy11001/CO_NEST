module.exports = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized access.' });
    }

    const roleName = req.user.role ? (req.user.role.name || req.user.role) : '';
    const hasRole = roles.map(r => r.toUpperCase()).includes(roleName.toUpperCase());
    if (!hasRole) {
      return res.status(403).json({ message: 'Access denied: Insufficient privileges.' });
    }

    next();
  };
};
