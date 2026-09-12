/* =====================================================================
   security.js — suraksha ka poora hissa ek jagah
   ===================================================================== */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { db } = require('./db');

/* ---------------------------------------------------------------
   1. CSRF — koi doosri website aapke form ko chupke se submit
      na kar sake. Har session ka apna token, har POST par jaanch.
   --------------------------------------------------------------- */
function csrfToken(req) {
  if (!req.session.csrf) req.session.csrf = crypto.randomBytes(32).toString('hex');
  return req.session.csrf;
}
function timingSafeEqual(a, b) {
  const A = Buffer.from(String(a));
  const B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}
function verifyCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  // File wale form (multipart) abhi parse nahi hue hain — unka token
  // multer ke baad checkCsrfAfterUpload() se jaancha jaata hai.
  if ((req.get('content-type') || '').startsWith('multipart/form-data')) {
    req._csrfPending = true;
    return next();
  }
  const sent = req.body?._csrf || req.get('x-csrf-token') || '';
  if (!req.session.csrf || !timingSafeEqual(sent, req.session.csrf)) {
    return res.status(403).json({ ok: false, error: 'Form ka token galat hai. Page refresh karke dobara try karein.' });
  }
  next();
}

/* ---------------------------------------------------------------
   1b. JSON ya HTML — React admin panel se aayi request "Accept:
       application/json" bhejti hai, isse hum pehchaan lete hain
       aur render() ki jagah json() bhej dete hain (feature same rehta hai).
   --------------------------------------------------------------- */
function wantsJson(req) {
  return (req.get('accept') || '').includes('application/json');
}

/* ---------------------------------------------------------------
   2. Input validation — har cheez ki lambai aur roop jaanchte hain.
      SQL injection alag se rukta hai kyunki hum har jagah
      parameterised query (?) use karte hain, string jodte nahi.
   --------------------------------------------------------------- */
function str(v, { min = 0, max = 500, name = 'Field' } = {}) {
  const s = String(v ?? '').trim().replace(/\u0000/g, '');
  if (s.length < min) throw new Error(`${name} bahut chhota hai`);
  if (s.length > max) throw new Error(`${name} bahut lamba hai (max ${max})`);
  return s;
}
function intv(v, { min = -1e9, max = 1e9, def = 0 } = {}) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}
function phone10(v) {
  const digits = String(v ?? '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9]\d{9}$/.test(digits)) throw new Error('Sahi 10-digit mobile number daalein');
  return digits;
}
const THEMES = ['p-a', 'p-b', 'p-c', 'p-d'];
function theme(v) { return THEMES.includes(v) ? v : 'p-a'; }

/* ---------------------------------------------------------------
   3. HTML escape — agar kabhi bina escape ke data chhapa jaaye
      to XSS na ho. (EJS ka <%= %> bhi khud escape karta hai.)
   --------------------------------------------------------------- */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------------------------------------------------------
   4. Login — bcrypt hash, aur 5 galat koshish par 15 min ka lock.
      Isse password guess karne wale bot bekaar ho jaate hain.
   --------------------------------------------------------------- */
const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60 * 1000;

function attemptLogin(username, password, ip) {
  const uname = String(username ?? '').trim().slice(0, 60);
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(uname);

  // user na mile tab bhi ek dummy hash check karte hain, taaki
  // jawaab ke time se pata na chale ki username sahi tha ya nahi
  const hash = admin ? admin.password_hash : '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
  const ok = bcrypt.compareSync(String(password ?? ''), hash);

  if (!admin) return { ok: false, error: 'Username ya password galat hai' };

  if (admin.locked_until > Date.now()) {
    const mins = Math.ceil((admin.locked_until - Date.now()) / 60000);
    return { ok: false, error: `Bahut galat koshish. ${mins} minute baad try karein.` };
  }

  if (!ok) {
    const fails = admin.failed_attempts + 1;
    const lock = fails >= LOCK_AFTER ? Date.now() + LOCK_MS : 0;
    db.prepare('UPDATE admins SET failed_attempts=?, locked_until=? WHERE id=?')
      .run(fails >= LOCK_AFTER ? 0 : fails, lock, admin.id);
    audit(null, uname, 'login_fail', `koshish ${fails}`, ip);
    return { ok: false, error: 'Username ya password galat hai' };
  }

  db.prepare('UPDATE admins SET failed_attempts=0, locked_until=0, last_login=? WHERE id=?')
    .run(Date.now(), admin.id);
  audit(admin.id, admin.username, 'login_ok', '', ip);
  return { ok: true, admin };
}

function setPassword(adminId, newPassword) {
  if (String(newPassword).length < 10) throw new Error('Password kam se kam 10 akshar ka rakhein');
  const hash = bcrypt.hashSync(String(newPassword), 12);
  db.prepare('UPDATE admins SET password_hash=?, must_change=0 WHERE id=?').run(hash, adminId);
}

/* ---------------------------------------------------------------
   5. Audit log — kis admin ne kab kya badla, sab likha jaata hai
   --------------------------------------------------------------- */
function audit(adminId, username, action, detail, ip) {
  db.prepare(`INSERT INTO audit_log (admin_id,username,action,detail,ip,created_at)
              VALUES (?,?,?,?,?,?)`)
    .run(adminId, String(username || ''), String(action), String(detail || '').slice(0, 300),
         String(ip || '').slice(0, 60), Date.now());
}

/* ---------------------------------------------------------------
   6. Login zaroori hai — har admin page se pehle
   --------------------------------------------------------------- */
function requireLogin(req, res, next) {
  if (!req.session.admin) {
    if (req.accepts('html')) return res.redirect('/admin/login');
    return res.status(401).json({ ok: false, error: 'Pehle login karein' });
  }
  // session 8 ghante se purana ho to bahar
  if (Date.now() - (req.session.loginAt || 0) > 8 * 3600 * 1000) {
    req.session.destroy(() => {});
    return res.redirect('/admin/login?timeout=1');
  }
  next();
}

/* ---------------------------------------------------------------
   7. File upload jaanch — sirf PDF/JPG/PNG/WEBP, aur file ke
      andar ke pehle byte (magic bytes) bhi check karte hain,
      kyunki extension badalna bahut aasan hai.
   --------------------------------------------------------------- */
const MAGIC = {
  pdf:  [[0x25, 0x50, 0x44, 0x46]],                    // %PDF
  jpg:  [[0xFF, 0xD8, 0xFF]],
  png:  [[0x89, 0x50, 0x4E, 0x47]],
  webp: [[0x52, 0x49, 0x46, 0x46]],                    // RIFF....WEBP
  glb:  [[0x67, 0x6C, 0x54, 0x46]],                    // glTF — 3D model file
};
function sniffType(buf) {
  for (const [type, sigs] of Object.entries(MAGIC)) {
    for (const sig of sigs) {
      if (sig.every((b, i) => buf[i] === b)) {
        if (type === 'webp' && buf.slice(8, 12).toString() !== 'WEBP') continue;
        return type;
      }
    }
  }
  return null;
}
function safeFilename(type) {
  return crypto.randomBytes(16).toString('hex') + '.' + type;
}

/* multipart form ke liye — multer ke turant baad lagana ZAROORI hai */
function checkCsrfAfterUpload(req, res, next) {
  const sent = req.body?._csrf || req.get('x-csrf-token') || '';
  if (!req.session.csrf || !timingSafeEqual(sent, req.session.csrf)) {
    return res.status(403).send('Form ka token galat hai. Page refresh karke dobara try karein.');
  }
  req._csrfPending = false;
  next();
}

const IMAGE_TYPES = ['jpg', 'png', 'webp'];

module.exports = {
  IMAGE_TYPES,
  csrfToken, verifyCsrf, checkCsrfAfterUpload, str, intv, phone10, theme, esc,
  attemptLogin, setPassword, audit, requireLogin, sniffType, safeFilename, wantsJson,
};
