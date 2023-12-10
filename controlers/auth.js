const User = require("../models/user");
const { ctrlWrapper, HttpError, sendEmail } = require("../helpers");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const fs = require("fs/promises");
const path = require("path");
const jimp = require("jimp");
const { nanoid } = require("nanoid");

const avatarsDir = path.join(__dirname, "..", "public", "avatars");
const avatarExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "tiff"];

const { SECRET_KEY, BASE_URL } = process.env;

const register = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (user) {
    throw new HttpError(409, "Email already in use");
  }
  const verificationToken = nanoid();
  const hashPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email, { s: "200", d: "mp" });
  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarURL,
    verificationToken,
  });

  const verifyEmail = {
    to: email,
    subject: "Verify email",
    html: `<a target= "_blank" href="${BASE_URL}/api/users/verify/${verificationToken}">Click to verify</a>`,
  };
  await sendEmail(verifyEmail);

  res.status(201).json({
    email: newUser.email,
    subscription: newUser.subscription,
    avatarURL: newUser.avatarURL,
  });
};

const resendVerifyEmail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw new HttpError(400, "missing required field email");
  }
  if (user.verify) {
    throw new HttpError(400, "Verification has already been passed");
  }

  const verifyEmail = {
    to: email,
    subject: "Verify email",
    html: `<a target= "_blank" href="${BASE_URL}/api/users/verify/${user.verificationToken}">Click to verify</a>`,
  };
  await sendEmail(verifyEmail);

  res.json({
    message: "Verification email sent",
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw new HttpError(401, "Email or password invalid");
  }
  if (!user.verify) {
    throw new HttpError(401, "Email not verified");
  }

  const comparePassword = await bcrypt.compare(password, user.password);
  if (!comparePassword) {
    throw new HttpError(401, "Email or password invalid");
  }

  const payload = { id: user._id };
  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });

  await User.findByIdAndUpdate(user._id, { token });

  res.json({
    token,
    user: {
      email: user.email,
      subscription: user.subscription,
    },
  });
};

const getCurrent = (req, res) => {
  const { email, subscription } = req.user;
  res.json({ email, subscription });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });
  res.json({
    message: "Logout success",
  });
};

const verifyEmail = async (req, res) => {
  const { verificationToken } = req.params;
  const user = await User.findOne({ verificationToken });
  if (!user) {
    throw new HttpError(404);
  }
  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationToken: null,
  });

  res.json({
    message: "Verification successful",
  });
};

const changeSubscription = async (req, res) => {
  const { _id } = req.user;
  const { subscription } = req.body;
  await User.findByIdAndUpdate(_id, { subscription });
  res.json({
    message: `Your subscription has been changed to ${subscription}`,
  });
};

const updateAvatarURL = async (req, res) => {
  const { _id } = req.user;
  const { path: tmpUpload, originalname } = req.file;
  const filename = `${_id}_${originalname}`;

  const fileExtension = originalname.substring(
    originalname.lastIndexOf(".") + 1
  );
  if (!avatarExtensions.includes(fileExtension.toLowerCase())) {
    throw new HttpError(
      400,
      `${originalname} includes an invalid file extension! Must be: ${avatarExtensions.join(
        ", "
      )}`
    );
  }

  const resultUpload = path.join(avatarsDir, filename);

  const img = await jimp.read(tmpUpload);
  img.resize(250, 250).quality(90).write(resultUpload);
  await fs.unlink(tmpUpload);

  const avatarURL = path.join("avatars", filename);

  await User.findByIdAndUpdate(_id, { avatarURL });

  res.json({
    avatarURL,
  });
};

module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  changeSubscription: ctrlWrapper(changeSubscription),
  updateAvatarURL: ctrlWrapper(updateAvatarURL),
  verifyEmail: ctrlWrapper(verifyEmail),
  resendVerifyEmail: ctrlWrapper(resendVerifyEmail),
};
