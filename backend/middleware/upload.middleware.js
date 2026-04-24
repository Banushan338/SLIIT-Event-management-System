const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_ROOT = path.join(__dirname, '..', 'uploads');
const PROFILE_DIR = path.join(UPLOAD_ROOT, 'profiles');
const EVENT_DIR = path.join(UPLOAD_ROOT, 'events');

if (!fs.existsSync(PROFILE_DIR)) {
  fs.mkdirSync(PROFILE_DIR, { recursive: true });
}
if (!fs.existsSync(EVENT_DIR)) {
  fs.mkdirSync(EVENT_DIR, { recursive: true });
}

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PROFILE_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  },
});
const eventStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, EVENT_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const safe = `event-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, safe);
  },
});

function fileFilter(_req, file, cb) {
  const ok = /^image\/(jpeg|png|gif|webp)$/i.test(file.mimetype);
  if (!ok) {
    cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed'));
    return;
  }
  cb(null, true);
}

const uploadProfileImage = multer({
  storage: profileStorage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

const uploadEventImages = multer({
  storage: eventStorage,
  fileFilter,
  limits: { fileSize: 3 * 1024 * 1024 },
});

module.exports = {
  uploadProfileImage,
  uploadEventImages,
  PROFILE_DIR,
  EVENT_DIR,
  UPLOAD_ROOT,
};
