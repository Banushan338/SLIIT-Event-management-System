const bcrypt = require('bcrypt');
const { User } = require('../models/user.model');

const authenticateUser = async (email, password) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return null;
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return null;
  }

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
};

module.exports = {
  authenticateUser,
};

