/* =====================================================================
   server.js — Pixel Skillz
   ===================================================================== */
require('dotenv').config();

const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const SqliteSessionStore = require('./src/session-store');

const { db, seed, DATA_DIR } = require('./src/db');
const { csrfToken, verifyCsrf } = require('./src/security');

seed();

const app = express();
const PORT = process.env.PORT || 3000;
const PROD = process.env.NODE_ENV === 'production';

/* server ki pehchaan chhupao — hamlawar ko madad na mile */
app.disable('x-powered-by');
app.set('trust proxy', 1);                 // nginx/Cloudflare ke peeche sahi IP mile
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* -------------------------------------------------------------
   Security headers — browser ko batate hain kya allowed hai
   ------------------------------------------------------------- */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      frameSrc: ['https://www.google.com'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],          // koi Flash/plugin nahi
      baseUri: ["'self'"],            // <base> tag se hijack nahi
      formAction: ["'self'"],         // form kisi aur site par submit nahi hoga
      frameAncestors: ["'none'"],     // koi aapki site ko iframe me nahi daal sakta
      upgradeInsecureRequests: PROD ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: PROD ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(compression());
app.use(express.urlencoded({ extended: false, limit: '64kb' }));  // bade payload block
app.use(express.json({ limit: '64kb' }));

/* -------------------------------------------------------------
   Session — cookie me sirf ek id, baaki sab server ke DB me
   ------------------------------------------------------------- */
app.use(session({
  store: new SqliteSessionStore(path.join(DATA_DIR, 'sessions.db')),
  secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
  name: 'psid',                      // default naam se stack chhupta hai
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,                  // JavaScript cookie ko chhu nahi sakta (XSS se bachav)
    sameSite: 'strict',              // doosri site se request par cookie nahi jaayegi
    secure: PROD,                    // sirf HTTPS par
    maxAge: 8 * 3600 * 1000,
  },
}));

/* -------------------------------------------------------------
   Rate limits — ek IP kitni baar kya kar sakti hai
   ------------------------------------------------------------- */
const generalLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false });
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10, skipSuccessfulRequests: true,
  message: { ok: false, error: 'Bahut koshish ho gayi. 15 minute baad try karein.' },
});
const enquiryLimit = rateLimit({
  windowMs: 60 * 60 * 1000, max: 8,
  message: { ok: false, error: 'Aaj ke liye bahut enquiry ho gayi. Kripya phone karein.' },
});
app.use(generalLimit);

/* CSRF har POST par */
app.use(verifyCsrf);

/* static files — cache ke saath, aur uploads kabhi execute na ho */
app.use('/css', express.static(path.join(__dirname, 'public/css'), { maxAge: '7d' }));
app.use('/js',  express.static(path.join(__dirname, 'public/js'),  { maxAge: '7d' }));
app.use('/img', express.static(path.join(__dirname, 'public/img'), { maxAge: '30d' }));
app.use('/uploads', express.static(path.join(__dirname, 'data/uploads'), {
  maxAge: '7d',
  setHeaders(res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
  },
}));

/* har view me csrf token mil jaaye */
app.use((req, res, next) => { res.locals.csrf = csrfToken(req); next(); });

/* -------------------------------------------------------------
   Routes
   ------------------------------------------------------------- */
app.use('/', require('./src/routes/public')(enquiryLimit));
app.use('/admin', require('./src/routes/admin')(loginLimit));

/* 404 */
app.use((req, res) => res.status(404).send('Page nahi mila. <a href="/">Home</a>'));

/* error handler — asli galti sirf server log me, user ko nahi */
app.use((err, req, res, next) => {
  console.error('[error]', err.message);
  if (res.headersSent) return next(err);
  res.status(500).send('Kuch gadbad ho gayi. Thodi der baad try karein.');
});

const server = app.listen(PORT, () => {
  console.log(`\n  Pixel Skillz chal raha hai →  http://localhost:${PORT}`);
  console.log(`  Admin panel               →  http://localhost:${PORT}/admin\n`);
});

module.exports = { app, server };
