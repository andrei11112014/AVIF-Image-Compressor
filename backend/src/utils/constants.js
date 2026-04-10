const path = require('path');

const PORT = 3001;
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const OUTPUTS_DIR = path.join(__dirname, '../../compressed');

module.exports = {
    PORT,
    UPLOADS_DIR,
    OUTPUTS_DIR,
};