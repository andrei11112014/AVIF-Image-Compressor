const sharp = require('sharp');

const compressWithSharp = async (inputPath, outputPath, quality, effort, scale) => {
    const start = Date.now();

    let sharpChain = sharp(inputPath);

    if (scale < 100) {
        const metadata = await sharp(inputPath).metadata();
        sharpChain = sharpChain.resize({
            width: Math.floor(metadata.width * (scale / 100)),
            height: Math.floor(metadata.height * (scale / 100)),
        });
    }

    const sharpEffort = Math.min(9, Math.max(0, effort - 1));

    await sharpChain
        .avif({ quality, effort: sharpEffort, chromaSubsampling: '4:2:0' })
        .toFile(outputPath);

    return Date.now() - start;
};

module.exports = compressWithSharp;