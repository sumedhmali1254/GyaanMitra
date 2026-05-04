const { validationResult } = require("express-validator");
const { User } = require("../models");
const generateToken = require("../utils/generateToken");

const updateStreak = async (user) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const settings = user.settings || {};
  let loginStreak = settings.loginStreak || 0;
  let lastLoginDate = settings.lastLoginDate ? new Date(settings.lastLoginDate) : null;
  
  let changed = false;

  if (lastLoginDate) {
    const lastLogin = new Date(lastLoginDate);
    lastLogin.setHours(0, 0, 0, 0);
    const diffTime = today.getTime() - lastLogin.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      loginStreak += 1;
      changed = true;
    } else if (diffDays > 1) {
      loginStreak = 1;
      changed = true;
    } else if (diffDays === 0) {
      // already logged in today, do nothing to streak
    }
  } else {
    loginStreak = 1;
    changed = true;
  }
  
  if (changed || !settings.lastLoginDate) {
    settings.loginStreak = loginStreak;
    settings.lastLoginDate = new Date().toISOString();
    user.settings = { ...settings };
    user.changed('settings', true);
    await user.save();
  }
  return user;
};

const registerUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { firstName, lastName, email, password, phone, location } = req.body;

    const existingUser = await User.findOne({ where: { email } });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const userData = {
      firstName,
      lastName,
      email,
      password,
      phone,
      location,
    };

    if (req.file) {
      userData.avatar = `/uploads/${req.file.filename}`;
    }

    let user = await User.create(userData);
    user = await updateStreak(user);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        token: generateToken(user.id),
      },
    });
  } catch (error) {
    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    let user = await User.findOne({ where: { email } });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user = await updateStreak(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        settings: user.settings,
        token: generateToken(user.id),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await updateStreak(req.user);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone, location, bio } = req.body;

    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;
    
    if (req.file) {
      user.avatar = `/uploads/${req.file.filename}`;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        location: user.location,
        bio: user.bio,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logoutUser = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Logout successful. Please remove token on frontend.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMe,
  updateProfile,
  logoutUser,
};
