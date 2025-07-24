const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../src/content');
const outDir = path.join(__dirname, '../dist/content/scripts');

const scripts = [
  'videoquality/VideoQualityScript.js',
  'videospeed/VideoSpeedScript.js',
  'subtitles/SubtitlesScript.js',
  'audionormalizer/AudioNormalizerScript.js',
  'volume/VolumeScript.js',
  'memberVideos/MembersFetchInterceptorScript.ts',
  'audioTrack/AudioTrackScript.js'
];

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

Promise.all(
  scripts.map(async (relPath) => {
    const src = path.join(srcDir, relPath);
    const out = path.join(
      outDir,
      path.basename(relPath).replace(/\.ts$/, '.js')
    );
    await esbuild.build({
      entryPoints: [src],
      bundle: true,
      platform: 'browser',
      format: 'iife',
      outfile: out,
      logLevel: 'info'
    });
    console.log(`Bundled: ${src} -> ${out}`);
  })
).catch((err) => {
  console.error(err);
  process.exit(1);
});