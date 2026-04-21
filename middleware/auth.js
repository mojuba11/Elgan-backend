const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  // 1. Look for the standard Authorization header
  const authHeader = req.header('Authorization');

  // 2. Check if it exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // 3. Extract the token (the string after the space)
  const token = authHeader.split(' ')[1];

  try {
    // 4. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 5. Attach user data (id and role) to the request object
    req.user = decoded; 
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
