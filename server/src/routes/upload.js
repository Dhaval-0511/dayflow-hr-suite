const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authMiddleware } = require('../middleware/auth');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage (no local disk needed)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only images and PDFs are allowed'));
  },
});

// ─── Upload File to Cloudinary ────────────────────────────────────────────────
router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });
  try {
    const folder = req.body.folder || 'hrms/uploads';
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'auto' },
        (err, result) => err ? reject(err) : resolve(result)
      );
      stream.end(req.file.buffer);
    });
    res.json({ url: result.secure_url, publicId: result.public_id });
  } catch (err) {
    console.error('Cloudinary upload error:', err);
    res.status(500).json({ error: 'File upload failed' });
  }
});

module.exports = router;
