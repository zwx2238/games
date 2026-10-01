// Fork cleanup regression test for the self-hosted sausi-games side page.
//
//   node test/fork-cleanup.cjs
//
// Zero dependencies. Three layers:
//   1. Static assertions on games/puzzle/memory/hdjdkd.html: the two
//      unconditional Google Analytics loaders and Chaotix.ai promotion stay removed
//      from the document AND from the Next.js flight payloads embedded in it
//      (those payloads re-list the same head nodes and would re-inject them).
//   2. Functional and provenance surfaces this fork must keep are present.
//   3. Every inline <script> payload still parses as a JS string literal.
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var PAGE = path.join(ROOT, 'games', 'puzzle', 'memory', 'hdjdkd.html');
var LOCAL_GAME = path.join(ROOT, 'games', 'puzzle', 'memory', 'index.html');
var page = fs.readFileSync(PAGE, 'utf8');

var failures = 0;
function check(desc, ok) {
  console.log((ok ? 'PASS' : 'FAIL') + ' ' + desc);
  if (!ok) failures++;
}
function absent(needle, desc) {
  var hit = page.indexOf(needle) !== -1;
  check(desc + ' removed (' + needle + ')', !hit);
}

// --- unconditional trackers and cross-product promotion removed -------------
absent('googletagmanager.com', 'Google Tag Manager loader (document + flight payload)');
absent('google-analytics', 'inline gtag block (document + flight payload)');
absent('G-SP33PHQRZJ', 'Google Analytics property #1');
absent('G-ETVMJ2K42N', 'Google Analytics property #2');
absent('gtag(', 'gtag call');
absent('window.dataLayer', 'dataLayer bootstrap');
check('Google API authentication loaders are preserved', page.includes('apis.google.com') && page.includes('gapi_processed'));
check('Firebase authentication iframe is preserved', page.includes('firebaseapp.com/__/auth/iframe'));
absent('chaotix.ai | Text to Game Platform', 'cross-product Twitter card title');
absent('Transform your text into immersive games with Chaotix.ai', 'cross-product Twitter card pitch');
absent('"@type":"Organization"', 'Chaotix.ai Organization JSON-LD');
absent('sameAs', 'social profile sameAs links');
absent('twitter:card', 'Twitter card meta');
absent('facebook.com/chaotix.ai', 'Facebook promo link');
absent('x.com/ChaotixAI', 'X promo link');
absent('instagram.com/chaotix.ai', 'Instagram promo link');
absent('>chaotix.ai</span>', 'visible Chaotix.ai watermark badge');

// --- functional and provenance surfaces preserved --------------------------
check('game iframe kept (functional game content)',
  page.indexOf('https://games.chaoswale.in/PriuKLl9wu/index.html') !== -1);
check('game title kept', page.indexOf('Bleach Memory Match') !== -1);
check('game description kept',
  page.indexOf('Embark on a memory matching journey') !== -1);
check('game thumbnail kept', page.indexOf('thumbnails/7CPjIx6QqVgiTy5CV2KXO9xVd173') !== -1);
check('snapshot provenance canonical kept', page.indexOf('rel="canonical" href="https://chaotix.ai"') !== -1);
check('web font stylesheet kept', page.indexOf('fonts.googleapis.com/css2?family=Poppins') !== -1);
check('local game entry kept', fs.existsSync(LOCAL_GAME));
check('local game mechanics kept',
  fs.existsSync(path.join(ROOT, 'games', 'puzzle', 'memory', 'mechanics.js')));
check('local game registry entry kept', fs.existsSync(path.join(ROOT, 'games', 'registry.json')));

// --- every embedded flight payload still decodes ---------------------------
var payloadRe = /self\.__next_f\.push\(\[1, ("(?:[^"\\]|\\.)*")\]\)/g;
var match, decoded = 0, decodeErrors = 0;
while ((match = payloadRe.exec(page)) !== null) {
  try {
    JSON.parse(match[1]);
    decoded++;
  } catch (e) {
    decodeErrors++;
    console.log('FAIL flight payload does not decode: ' + e.message);
  }
}
check('all ' + decoded + ' flight payloads decode as JS string literals', decodeErrors === 0);
check('at least one flight payload present', decoded > 0);

if (failures > 0) {
  console.error(failures + ' check(s) failed');
  process.exit(1);
}
console.log('fork cleanup checks passed');
