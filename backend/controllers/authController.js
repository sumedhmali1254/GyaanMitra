const { validationResult } = require("express-validator");
const { User } = require("../models");
const generateToken = require("../utils/generateToken");
const { recordLoginStreak } = require("../utils/loginStreak");

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

    const user = await User.create(userData);
    user.settings = recordLoginStreak(user.settings, req.body.loginDate);
    await user.save();

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        loginStreak: user.settings.loginStreak,
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

    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    user.settings = recordLoginStreak(user.settings, req.body.loginDate);
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        loginStreak: user.settings.loginStreak,
        settings: user.settings,
        token: generateToken(user.id),
      },
    });
  } catch (error) {
    next(error);
  }
};

const guestLogin = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      message: "Guest session started. It will expire in 15 minutes.",
      data: {
        id: null,
        firstName: "Guest",
        lastName: "Learner",
        email: null,
        isGuest: true,
        token: generateToken(null, {
          expiresIn: "15m",
          payload: { guest: true },
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        ...req.user.toJSON(),
        loginStreak: Math.max(0, Number(req.user.settings?.loginStreak) || 0),
      },
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
    } else if (req.body.removeAvatar === "true") {
      user.avatar = null;
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
  guestLogin,
  getMe,
  updateProfile,
  logoutUser,
};
