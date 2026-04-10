const fs = require('fs');
const { UPLOADS_DIR, OUTPUTS_DIR } = require('../utils/constants');

const ensureDirectories = () => {
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    if (!fs.existsSync(OUTPUTS_DIR)) fs.mkdirSync(OUTPUTS_DIR, { recursive: true });
};

module.exports = ensureDirectories;