const fs = require('fs');

const cleanupFiles = (...paths) => {
    paths.forEach((p) => {
        if (p && fs.existsSync(p)) {
            try {
                fs.unlinkSync(p);
            } catch (e) {
                console.error(`Failed to delete ${p}:`, e.message);
            }
        }
    });
};

module.exports = cleanupFiles;