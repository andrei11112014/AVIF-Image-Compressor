const multer = require('multer');
const { UPLOADS_DIR } = require('../utils/constants');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, file.originalname + '-' + Date.now()),
});

const upload = multer({ dest: UPLOADS_DIR });

module.exports = upload;