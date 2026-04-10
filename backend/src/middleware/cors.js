const cors = require('cors');

const corsOptions = {
    origin: '*',
    exposedHeaders: ['X-Compression-Time'],
};

module.exports = cors(corsOptions);