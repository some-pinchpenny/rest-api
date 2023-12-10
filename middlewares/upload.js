const multer = require("multer");
const path = require("path");

const tempDir = path.join(__dirname, "../tmp");
const maxSize = 1024000;

const multerConfig = multer.diskStorage({
  destination: tempDir,
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: multerConfig,
  limits: { fileSize: maxSize },
});

module.exports = upload;
