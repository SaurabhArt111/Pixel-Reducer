const sharp = require('sharp');
const path = require('path');

/**
 * Read dimensions of an image, correcting for EXIF orientation so the
 * numbers reflect how the image actually displays (not the raw sensor
 * pixel grid).
 */
async function readOrientedMetadata(filePath) {
  const metadata = await sharp(filePath).metadata();
  const swapped = [5, 6, 7, 8].includes(metadata.orientation);

  return {
    width: swapped ? metadata.height : metadata.width,
    height: swapped ? metadata.width : metadata.height,
    format: metadata.format,
    hasAlpha: metadata.hasAlpha
  };
}

/**
 * Compute the output width/height for a given original size, target width
 * and "don't enlarge" preference. Mirrors what Sharp's `withoutEnlargement`
 * does internally, so the UI can preview the exact result before processing.
 */
function computeOutputDimensions(originalWidth, originalHeight, targetWidth, dontEnlarge) {
  if (!originalWidth || !originalHeight) return { width: targetWidth, height: targetWidth };

  const effectiveWidth = dontEnlarge ? Math.min(targetWidth, originalWidth) : targetWidth;
  const height = Math.round((effectiveWidth / originalWidth) * originalHeight);

  return { width: effectiveWidth, height };
}

/**
 * Decide the output file extension + Sharp format name for a given
 * source format and the user's requested output format.
 */
function resolveOutputFormat(outputFormat, sourceFormat) {
  const map = {
    jpg: { ext: '.jpg', sharpFormat: 'jpeg' },
    jpeg: { ext: '.jpg', sharpFormat: 'jpeg' },
    png: { ext: '.png', sharpFormat: 'png' },
    webp: { ext: '.webp', sharpFormat: 'webp' },
    tiff: { ext: '.tiff', sharpFormat: 'tiff' },
    tif: { ext: '.tiff', sharpFormat: 'tiff' }
  };

  if (outputFormat && outputFormat !== 'original') {
    return map[outputFormat] || map.jpg;
  }

  // "Original" - keep the source format where practical, defaulting to jpeg
  return map[sourceFormat] || map.jpg;
}

/**
 * Resize + re-encode a single image with Sharp, writing the result to
 * `outputPath`. Returns the final width/height/size written.
 */
async function processImage({
  inputPath,
  outputPath,
  targetWidth,
  dontEnlarge,
  outputFormat,
  quality
}) {
  const metadata = await sharp(inputPath).metadata();
  const { ext, sharpFormat } = resolveOutputFormat(outputFormat, metadata.format);

  const finalOutputPath = outputPath.replace(/\.[^./]+$/, '') + ext;

  let pipeline = sharp(inputPath, { failOn: 'none' })
    .rotate() // auto-orient using EXIF, then bake orientation into pixels
    .resize({
      width: targetWidth,
      withoutEnlargement: !!dontEnlarge,
      fit: 'inside' // never crop; width drives the resize, height follows ratio
    });

  const q = Math.min(100, Math.max(1, parseInt(quality, 10) || 90));

  switch (sharpFormat) {
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: q, mozjpeg: true });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: q });
      break;
    case 'png':
      pipeline = pipeline.png({ quality: q, palette: q < 100, compressionLevel: 9 });
      break;
    case 'tiff':
      pipeline = pipeline.tiff({ quality: q });
      break;
    default:
      pipeline = pipeline.jpeg({ quality: q, mozjpeg: true });
  }

  const info = await pipeline.toFile(finalOutputPath);

  return {
    outputPath: finalOutputPath,
    width: info.width,
    height: info.height,
    size: info.size
  };
}

module.exports = {
  readOrientedMetadata,
  computeOutputDimensions,
  resolveOutputFormat,
  processImage
};
