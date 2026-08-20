const fs = require('fs');
const os = require('os');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

function tmpFile(ext) {
  return path.join(os.tmpdir(), `satria-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
}

/**
 * Convert an image or video buffer into a WhatsApp-ready animated/static webp sticker.
 */
function bufferToSticker(buffer, isVideo) {
  return new Promise((resolve, reject) => {
    const inputExt = isVideo ? 'mp4' : 'png';
    const inPath = tmpFile(inputExt);
    const outPath = tmpFile('webp');
    fs.writeFileSync(inPath, buffer);

    const command = ffmpeg(inPath)
      .outputOptions([
        '-vcodec', 'libwebp',
        '-vf',
        "scale='min(512,iw)':min'(512,ih)':force_original_aspect_ratio=decrease,fps=15,pad=512:512:-1:-1:color=white@0.0",
        '-loop', '0',
        '-preset', 'default',
        '-an',
        '-vsync', '0',
        '-t', '00:00:06',
      ])
      .toFormat('webp')
      .on('end', () => {
        const out = fs.readFileSync(outPath);
        fs.unlinkSync(inPath);
        fs.unlinkSync(outPath);
        resolve(out);
      })
      .on('error', (err) => {
        try { fs.unlinkSync(inPath); } catch {}
        try { fs.unlinkSync(outPath); } catch {}
        reject(err);
      });

    command.save(outPath);
  });
}

/**
 * Convert an animated webp sticker buffer into an mp4 video buffer (.tovid).
 */
function webpToVideo(buffer) {
  return new Promise((resolve, reject) => {
    const inPath = tmpFile('webp');
    const outPath = tmpFile('mp4');
    fs.writeFileSync(inPath, buffer);

    ffmpeg(inPath)
      .outputOptions([
        '-movflags', 'faststart',
        '-pix_fmt', 'yuv420p',
        '-vf', "scale=trunc(iw/2)*2:trunc(ih/2)*2",
      ])
      .toFormat('mp4')
      .on('end', () => {
        const out = fs.readFileSync(outPath);
        fs.unlinkSync(inPath);
        fs.unlinkSync(outPath);
        resolve(out);
      })
      .on('error', (err) => {
        try { fs.unlinkSync(inPath); } catch {}
        try { fs.unlinkSync(outPath); } catch {}
        reject(err);
      })
      .save(outPath);
  });
}

module.exports = { bufferToSticker, webpToVideo };
