/* =====================================================================
   routes/admin.js — admin panel (login zaroori)
   ===================================================================== */
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db, allSettings, setSetting, allImages, IMAGE_SLOTS, BUILDERS } = require('../db');
const {
  str, intv, theme, attemptLogin, setPassword, audit,
  requireLogin, sniffType, safeFilename, checkCsrfAfterUpload, IMAGE_TYPES,
  csrfToken, wantsJson,
} = require('../security');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

/* file memory me leke khud jaanchte hain, phir disk par likhte hain */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});
/* 3D model files bhaari hoti hain — inke liye alag, bada limit */
const uploadModel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 1 },
});

/* har table ka naksha: kaun se column, kaise validate honge */
const TABLES = {
  toppers: {
    label: 'Toppers / Results',
    fields: [
      { k: 'name', t: 'text', label: 'Naam', max: 80, required: true },
      { k: 'school', t: 'text', label: 'School / College', max: 120 },
      { k: 'score', t: 'text', label: 'Percentage ya Course', max: 40 },
      { k: 'klass', t: 'text', label: 'Class (jaise CLASS 12)', max: 30 },
      { k: 'groupname', t: 'select', label: 'Kaunsa banner', options: ['board', 'computer'] },
      { k: 'theme', t: 'theme', label: 'Rang' },
    ],
    hasFile: true, fileKind: 'image', fileLabel: 'Student ki photo',
  },
  courses: {
    label: 'Courses',
    fields: [
      { k: 'title', t: 'text', label: 'Course ka naam', max: 120, required: true },
      { k: 'badge1', t: 'text', label: 'Badge 1', max: 40 },
      { k: 'badge2', t: 'text', label: 'Badge 2', max: 40 },
      { k: 'meta1', t: 'text', label: 'Neeche line 1', max: 40 },
      { k: 'meta2', t: 'text', label: 'Neeche line 2', max: 40 },
      { k: 'theme', t: 'theme', label: 'Rang' },
      { k: 'tagline', t: 'text', label: 'Detail page — tagline', max: 80 },
      { k: 'duration', t: 'text', label: 'Detail page — duration', max: 60 },
      { k: 'topic_word', t: 'text', label: 'Detail page — orb ka short word', max: 20 },
      { k: 'fees_text', t: 'text', label: 'Detail page — fees line', max: 60 },
      { k: 'description', t: 'textarea', label: 'Detail page — description', max: 600 },
      { k: 'syllabus_beginner', t: 'textarea', label: 'Syllabus — Beginner (ek line = ek topic)', max: 500 },
      { k: 'syllabus_advanced', t: 'textarea', label: 'Syllabus — Advanced (ek line = ek topic)', max: 500 },
    ],
    hasFile: true, fileKind: 'image', fileLabel: 'Course ka photo',
  },
  faculty: {
    label: 'Faculty',
    fields: [
      { k: 'name', t: 'text', label: 'Naam', max: 80, required: true },
      { k: 'subject', t: 'text', label: 'Subject · Class', max: 60 },
      { k: 'detail', t: 'text', label: 'Qualification / anubhav', max: 160 },
      { k: 'initials', t: 'text', label: 'Do akshar (agar photo na ho)', max: 3 },
      { k: 'theme', t: 'theme', label: 'Rang' },
    ],
    hasFile: true, fileKind: 'image', fileLabel: 'Teacher ki photo',
  },
  testimonials: {
    label: 'Testimonials',
    fields: [
      { k: 'name', t: 'text', label: 'Naam', max: 80, required: true },
      { k: 'role', t: 'text', label: 'Kaun hain', max: 60 },
      { k: 'quote', t: 'textarea', label: 'Unhone kya kaha', max: 400, required: true },
      { k: 'stars', t: 'number', label: 'Stars (1–5)', min: 1, max: 5 },
      { k: 'initials', t: 'text', label: 'Do akshar', max: 3 },
      { k: 'theme', t: 'theme', label: 'Rang' },
    ],
  },
  fees: {
    label: 'Fees',
    fields: [
      { k: 'batch', t: 'text', label: 'Batch', max: 80, required: true },
      { k: 'timing', t: 'text', label: 'Timing', max: 60 },
      { k: 'days', t: 'text', label: 'Din', max: 40 },
      { k: 'amount', t: 'text', label: 'Fees', max: 30 },
    ],
  },
  notes: {
    label: 'Study Material',
    fields: [
      { k: 'title', t: 'text', label: 'Notes ka naam', max: 120, required: true },
      { k: 'meta', t: 'text', label: 'Choti jaankari', max: 80 },
    ],
    hasFile: true, fileKind: 'pdf', fileLabel: 'PDF file',
  },
  faqs: {
    label: 'FAQ',
    fields: [
      { k: 'question', t: 'text', label: 'Sawaal', max: 200, required: true },
      { k: 'answer', t: 'textarea', label: 'Jawaab', max: 800, required: true },
    ],
  },
};

function readFields(table, body) {
  const out = {};
  for (const f of TABLES[table].fields) {
    const raw = body[f.k];
    if (f.t === 'number') out[f.k] = intv(raw, { min: f.min ?? 0, max: f.max ?? 99, def: f.min ?? 0 });
    else if (f.t === 'theme') out[f.k] = theme(raw);
    else if (f.t === 'select') out[f.k] = f.options.includes(raw) ? raw : f.options[0];
    else out[f.k] = str(raw, { min: f.required ? 1 : 0, max: f.max ?? 300, name: f.label });
  }
  out.sort = intv(body.sort, { min: 0, max: 9999, def: 0 });
  out.active = body.active ? 1 : 0;
  return out;
}


/* ================================================================
   GLB HELPERS — server par hi kaam karte hain, browser ki zaroorat nahi
   ================================================================ */

function extractGlbMeshNames(buf) {
  try {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const magic = dv.getUint32(0, true);
    if (magic !== 0x46546C67) return ['Poora Model'];          // 'glTF'
    const jsonLen = dv.getUint32(12, true);
    const json = JSON.parse(Buffer.from(buf.buffer, buf.byteOffset + 20, jsonLen).toString('utf8'));

    // 1. Mesh ke naam try karo
    const meshNames = (json.meshes || []).map(m => m.name || '').filter(Boolean);
    if (meshNames.length > 1) return meshNames;

    // 2. Node ke naam try karo (jo mesh se linked hain)
    const nodes = (json.nodes || []).filter(n => n.mesh !== undefined && n.name);
    if (nodes.length > 1) return nodes.map(n => n.name);

    // 3. Sirf ek bada group hai — uske children lao
    const rootNodes = (json.scenes || [{}])[0].nodes || [];
    const allNodes = json.nodes || [];
    for (const ri of rootNodes) {
      const root = allNodes[ri];
      if (root && root.children && root.children.length > 1) {
        const childNames = root.children
          .map(ci => allNodes[ci])
          .filter(n => n && n.mesh !== undefined && n.name)
          .map(n => n.name);
        if (childNames.length > 1) return childNames;
      }
    }

    return meshNames.length ? meshNames : ['Poora Model'];
  } catch (_) { return ['Poora Model']; }
}

function detectRotation(buf) {
  /* Zyadatar models ya seedhe hote hain ya Z-up (Blender/CAD).
     Hum bounding box dekh ke pata karte hain:
     - Y sabse lamba: theek hai (Y-up), ghoomane ki zaroorat nahi
     - Z sabse lamba: Z-up hai, X ko -90 kar do
     - X sabse lamba: sideways hai, Z ko 90 kar do               */
  try {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    const jsonLen = dv.getUint32(12, true);
    const json = JSON.parse(Buffer.from(buf.buffer, buf.byteOffset + 20, jsonLen).toString('utf8'));
    const binOff = buf.byteOffset + 20 + jsonLen + 8;          // BIN chunk ke baad

    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for (const acc of (json.accessors || [])) {
      if (acc.type !== 'VEC3' || acc.componentType !== 5126) continue;
      if (!acc.min || !acc.max) continue;
      minX=Math.min(minX,acc.min[0]); maxX=Math.max(maxX,acc.max[0]);
      minY=Math.min(minY,acc.min[1]); maxY=Math.max(maxY,acc.max[1]);
      minZ=Math.min(minZ,acc.min[2]); maxZ=Math.max(maxZ,acc.max[2]);
    }
    const sx=maxX-minX, sy=maxY-minY, sz=maxZ-minZ;
    if (!isFinite(sx) || !isFinite(sy) || !isFinite(sz)) return [0,0,0];
    const biggest = Math.max(sx,sy,sz);
    if (biggest === sz) return [-90, 0, 0];   // Z-up → X se -90 ghoomao
    if (biggest === sx) return [0, 0, 90];    // X-up → Z se 90 ghoomao
    return [0, 0, 0];                         // Y-up → theek hai
  } catch (_) { return [0, 0, 0]; }
}

module.exports = function (loginLimit) {
  const router = express.Router();

  /* ---------------- login ---------------- */
  router.get('/login', (req, res) => {
    if (req.session.admin) return res.redirect('/admin');
    res.render('admin/login', { error: null, timeout: req.query.timeout });
  });

  router.post('/login', loginLimit, (req, res) => {
    const r = attemptLogin(req.body.username, req.body.password, req.ip);
    if (!r.ok) {
      if (wantsJson(req)) return res.status(401).json({ ok: false, error: r.error });
      return res.status(401).render('admin/login', { error: r.error, timeout: null });
    }

    // session fixation se bachav: login ke baad nayi session id
    req.session.regenerate((err) => {
      if (err) {
        if (wantsJson(req)) return res.status(500).json({ ok: false, error: 'Session banane me dikkat' });
        return res.status(500).send('Session banane me dikkat');
      }
      req.session.admin = { id: r.admin.id, username: r.admin.username, name: r.admin.name };
      req.session.loginAt = Date.now();
      req.session.mustChange = !!r.admin.must_change;
      if (wantsJson(req)) {
        // regenerate() ne purana CSRF token ud diya — nayi session ke liye naya de dein
        return res.json({ ok: true, admin: req.session.admin, mustChange: req.session.mustChange, csrf: csrfToken(req) });
      }
      res.redirect(r.admin.must_change ? '/admin/password' : '/admin');
    });
  });

  router.post('/logout', requireLogin, (req, res) => {
    audit(req.session.admin.id, req.session.admin.username, 'logout', '', req.ip);
    req.session.destroy(() => {
      if (wantsJson(req)) return res.json({ ok: true });
      res.redirect('/admin/login');
    });
  });

  /* React admin panel ke liye: auth status + CSRF token, login se pehle bhi chalta hai */
  router.get('/session', (req, res) => {
    res.json({
      authenticated: !!req.session.admin,
      admin: req.session.admin || null,
      csrf: csrfToken(req),
    });
  });

  router.use(requireLogin);

  /* ---------------- password badlein ---------------- */
  router.get('/password', (req, res) =>
    res.render('admin/password', { admin: req.session.admin, error: null, done: false, tables: TABLES }));

  router.post('/password', (req, res) => {
    try {
      const check = attemptLogin(req.session.admin.username, req.body.current, req.ip);
      if (!check.ok) throw new Error('Purana password galat hai');
      if (req.body.next !== req.body.confirm) throw new Error('Dono naye password alag hain');
      setPassword(req.session.admin.id, req.body.next);
      audit(req.session.admin.id, req.session.admin.username, 'password_change', '', req.ip);
      req.session.mustChange = false;
      res.render('admin/password', { admin: req.session.admin, error: null, done: true, tables: TABLES });
    } catch (e) {
      res.render('admin/password', { admin: req.session.admin, error: e.message, done: false, tables: TABLES });
    }
  });

  /* ---------------- dashboard ---------------- */
  router.get('/', (req, res) => {
    const day = Date.now() - 86400000;
    const week = Date.now() - 7 * 86400000;
    const payload = {
      admin: req.session.admin,
      counts: {
        leadsTotal: db.prepare('SELECT COUNT(*) c FROM leads').get().c,
        leadsDay: db.prepare('SELECT COUNT(*) c FROM leads WHERE created_at>?').get(day).c,
        leadsWeek: db.prepare('SELECT COUNT(*) c FROM leads WHERE created_at>?').get(week).c,
        naya: db.prepare("SELECT COUNT(*) c FROM leads WHERE status='naya'").get().c,
      },
      recent: db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 8').all(),
      mustChange: req.session.mustChange,
    };
    if (wantsJson(req)) return res.json(payload);
    res.render('admin/dashboard', { ...payload, tables: TABLES });
  });

  /* ---------------- leads ---------------- */
  router.get('/leads', (req, res) => {
    const status = ['naya', 'baat_hui', 'admission', 'nahi'].includes(req.query.status) ? req.query.status : null;
    const rows = status
      ? db.prepare('SELECT * FROM leads WHERE status=? ORDER BY id DESC LIMIT 500').all(status)
      : db.prepare('SELECT * FROM leads ORDER BY id DESC LIMIT 500').all();
    if (wantsJson(req)) return res.json({ rows, status });
    res.render('admin/leads', { admin: req.session.admin, tables: TABLES, rows, status });
  });

  router.post('/leads/:id/status', (req, res) => {
    const id = intv(req.params.id, { min: 1 });
    const st = ['naya', 'baat_hui', 'admission', 'nahi'].includes(req.body.status) ? req.body.status : 'naya';
    db.prepare('UPDATE leads SET status=? WHERE id=?').run(st, id);
    audit(req.session.admin.id, req.session.admin.username, 'lead_status', `#${id} → ${st}`, req.ip);
    if (wantsJson(req)) return res.json({ ok: true, id, status: st });
    res.redirect('/admin/leads');
  });

  router.get('/leads.csv', (req, res) => {
    const rows = db.prepare('SELECT * FROM leads ORDER BY id DESC').all();
    const head = 'id,date,name,phone,course,time,message,status\n';
    const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const body = rows.map(r => [
      r.id, new Date(r.created_at).toLocaleString('en-IN'), r.name, "'" + r.phone,
      r.course, r.time_pref, r.message, r.status,
    ].map(esc).join(',')).join('\n');
    audit(req.session.admin.id, req.session.admin.username, 'leads_export', `${rows.length} rows`, req.ip);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
    res.send('\uFEFF' + head + body);
  });

  /* ---------------- settings ---------------- */
  const SETTING_KEYS = [
    'institute_name','city','tagline','announcement','phone','whatsapp','email',
    'address_line1','address_line2','timings','timings_extra','map_query',
    'facebook','instagram','youtube','stat_years','stat_students','stat_result',
    'stat_teachers','trophy_text','banner1_count','banner1_text','banner2_count','banner2_text',
    'about_subtitle','about_para1','about_para2',
    'cta_heading','cta_subtext','cta_button_text',
  ];

  router.get('/settings', (req, res) => {
    if (wantsJson(req)) return res.json({ settings: allSettings(), keys: SETTING_KEYS });
    res.render('admin/settings', { admin: req.session.admin, tables: TABLES, s: allSettings(), keys: SETTING_KEYS, done: false });
  });

  router.post('/settings', (req, res) => {
    for (const k of SETTING_KEYS) {
      if (k in req.body) setSetting(k, str(req.body[k], { max: 400 }));
    }
    audit(req.session.admin.id, req.session.admin.username, 'settings_update', '', req.ip);
    if (wantsJson(req)) return res.json({ ok: true, settings: allSettings() });
    res.render('admin/settings', { admin: req.session.admin, tables: TABLES, s: allSettings(), keys: SETTING_KEYS, done: true });
  });

  /* ---------------- generic CRUD ---------------- */
  function guard(req, res, next) {
    if (!TABLES[req.params.table]) return res.status(404).send('Aisi koi cheez nahi');
    next();
  }

  router.get('/t/:table', guard, (req, res) => {
    const t = req.params.table;
    const rows = db.prepare(`SELECT * FROM ${t} ORDER BY sort, id`).all();   // t upar validate ho chuka
    if (wantsJson(req)) return res.json({ table: t, meta: TABLES[t], rows });
    res.render('admin/table', { admin: req.session.admin, tables: TABLES, table: t, meta: TABLES[t], rows });
  });

  router.post('/t/:table/save', guard, upload.single('file'), checkCsrfAfterUpload, (req, res) => {
    const t = req.params.table;
    const meta = TABLES[t];
    try {
      const data = readFields(t, req.body);

      if (meta.hasFile && req.file) {
        const type = sniffType(req.file.buffer);
        if (!type) throw new Error('File pehchani nahi gayi. Sirf PDF, JPG, PNG ya WEBP chalegi.');
        if (meta.fileKind === 'pdf' && type !== 'pdf') throw new Error('Yahan sirf PDF file chalegi');
        if (meta.fileKind === 'image' && !IMAGE_TYPES.includes(type)) throw new Error('Yahan sirf photo (JPG/PNG/WEBP) chalegi');
        const fname = safeFilename(type);
        fs.writeFileSync(path.join(UPLOAD_DIR, fname), req.file.buffer);
        if (meta.fileKind === 'image') {
          data.photo = fname;
        } else {
          data.filename = fname;
          data.original = path.basename(req.file.originalname).slice(0, 100);
        }
      }

      const id = intv(req.body.id, { min: 0 });
      const cols = Object.keys(data);
      let newId = id;

      if (id > 0) {
        const set = cols.map(c => `${c}=?`).join(',');
        db.prepare(`UPDATE ${t} SET ${set} WHERE id=?`).run(...cols.map(c => data[c]), id);
        audit(req.session.admin.id, req.session.admin.username, `${t}_update`, `#${id}`, req.ip);
      } else {
        const marks = cols.map(() => '?').join(',');
        const info = db.prepare(`INSERT INTO ${t} (${cols.join(',')}) VALUES (${marks})`).run(...cols.map(c => data[c]));
        newId = Number(info.lastInsertRowid);
        audit(req.session.admin.id, req.session.admin.username, `${t}_create`, data.name || data.title || '', req.ip);
      }
      if (wantsJson(req)) return res.json({ ok: true, row: { id: newId, ...data } });
      res.redirect(`/admin/t/${t}`);
    } catch (e) {
      if (wantsJson(req)) return res.status(400).json({ ok: false, error: e.message });
      const rows = db.prepare(`SELECT * FROM ${t} ORDER BY sort, id`).all();
      res.status(400).render('admin/table', {
        admin: req.session.admin, tables: TABLES, table: t, meta, rows, error: e.message,
      });
    }
  });

  router.post('/t/:table/:id/delete', guard, (req, res) => {
    const t = req.params.table;
    const id = intv(req.params.id, { min: 1 });
    const fileCol = t === 'notes' ? 'filename' : (TABLES[t].fileKind === 'image' ? 'photo' : null);
    if (fileCol) {
      const row = db.prepare(`SELECT ${fileCol} AS f FROM ${t} WHERE id=?`).get(id);
      if (row?.f) {
        const f = path.join(UPLOAD_DIR, path.basename(row.f));
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
    }
    if (t === 'courses') {
      const row = db.prepare('SELECT hero_icon FROM courses WHERE id=?').get(id);
      if (row?.hero_icon) {
        const f = path.join(UPLOAD_DIR, path.basename(row.hero_icon));
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }
    }
    db.prepare(`DELETE FROM ${t} WHERE id=?`).run(id);
    audit(req.session.admin.id, req.session.admin.username, `${t}_delete`, `#${id}`, req.ip);
    if (wantsJson(req)) return res.json({ ok: true, id });
    res.redirect(`/admin/t/${t}`);
  });

  /* ---------------- course ka hero-orbit icon (course.photo se alag —
     home page ke ghoomte hue badge ke liye, khaas iske apna upload) ---------------- */
  router.post('/t/courses/:id/hero-icon', upload.single('file'), checkCsrfAfterUpload, (req, res) => {
    const id = intv(req.params.id, { min: 1 });
    try {
      if (!req.file) throw new Error('Koi photo chuni hi nahi');
      const type = sniffType(req.file.buffer);
      if (!IMAGE_TYPES.includes(type)) throw new Error('Sirf JPG, PNG ya WEBP photo chalegi');

      const old = db.prepare('SELECT hero_icon FROM courses WHERE id=?').get(id);
      if (old?.hero_icon) {
        const f = path.join(UPLOAD_DIR, path.basename(old.hero_icon));
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }

      const fname = safeFilename(type);
      fs.writeFileSync(path.join(UPLOAD_DIR, fname), req.file.buffer);
      db.prepare('UPDATE courses SET hero_icon=? WHERE id=?').run(fname, id);
      audit(req.session.admin.id, req.session.admin.username, 'course_hero_icon', `#${id}`, req.ip);
      if (wantsJson(req)) return res.json({ ok: true, id, hero_icon: fname });
      res.redirect('/admin/t/courses');
    } catch (e) {
      if (wantsJson(req)) return res.status(400).json({ ok: false, error: e.message });
      res.status(400).redirect('/admin/t/courses');
    }
  });

  router.post('/t/courses/:id/hero-icon/delete', (req, res) => {
    const id = intv(req.params.id, { min: 1 });
    const row = db.prepare('SELECT hero_icon FROM courses WHERE id=?').get(id);
    if (row?.hero_icon) {
      const f = path.join(UPLOAD_DIR, path.basename(row.hero_icon));
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    db.prepare("UPDATE courses SET hero_icon='' WHERE id=?").run(id);
    audit(req.session.admin.id, req.session.admin.username, 'course_hero_icon_delete', `#${id}`, req.ip);
    if (wantsJson(req)) return res.json({ ok: true, id });
    res.redirect('/admin/t/courses');
  });

  /* ---------------- 3D topics ---------------- */
  const BKEYS = BUILDERS.map(b => b.key);

  router.get('/topics', (req, res) => {
    const rows = db.prepare('SELECT * FROM topics ORDER BY sort, id').all();
    const cnt = db.prepare('SELECT COUNT(*) c FROM topic_parts WHERE topic_id=?');
    res.render('admin/topics', {
      admin: req.session.admin, tables: TABLES, builders: BUILDERS,
      rows: rows.map(r => ({ ...r, nparts: cnt.get(r.id).c })), error: null,
    });
  });

  router.post('/topics/save', uploadModel.single('model_file'), (req, res) => {
    try {
      const id = intv(req.body.id, { min: 0 });
      const label = str(req.body.label, { min: 1, max: 60, name: 'Topic ka naam' });
      const builder = BKEYS.includes(req.body.builder) ? req.body.builder : 'layers';
      const subject = str(req.body.subject, { max: 30 }) || 'Science';
      const sort = intv(req.body.sort, { min: 0, max: 999 });
      const active = req.body.active ? 1 : 0;
      const dist = Math.min(20, Math.max(5, parseFloat(req.body.dist) || 9.5));
      const deg = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? ((n % 360) + 360) % 360 : 0; };
      const rx = deg(req.body.rot_x), ry = deg(req.body.rot_y), rz = deg(req.body.rot_z);

      let newId = id;
      if (id > 0) {
        db.prepare('UPDATE topics SET label=?,builder=?,subject=?,dist=?,sort=?,active=?,rot_x=?,rot_y=?,rot_z=? WHERE id=?')
          .run(label, builder, subject, dist, sort, active, rx, ry, rz, id);
        audit(req.session.admin.id, req.session.admin.username, 'topic_update', label, req.ip);
      } else {
        let tkey = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'topic';
        while (db.prepare('SELECT 1 FROM topics WHERE tkey=?').get(tkey)) tkey += '-' + Math.floor(Math.random() * 99);
        const nr = db.prepare('INSERT INTO topics (tkey,label,builder,dist,subject,sort,active) VALUES (?,?,?,?,?,?,?)')
          .run(tkey, label, builder, dist, subject, sort, active);
        newId = Number(nr.lastInsertRowid);
        audit(req.session.admin.id, req.session.admin.username, 'topic_create', label, req.ip);
      }

      // agar naye topic ke saath file bhi aayi to process karo
      if (req.file && newId) {
        const type = sniffType(req.file.buffer);
        if (type === 'glb') {
          const old = db.prepare('SELECT model_file FROM topics WHERE id=?').get(newId);
          if (old?.model_file) {
            const of_ = path.join(UPLOAD_DIR, path.basename(old.model_file));
            if (fs.existsSync(of_)) fs.unlinkSync(of_);
          }
          const fname = safeFilename('glb');
          fs.writeFileSync(path.join(UPLOAD_DIR, fname), req.file.buffer);
          const names = extractGlbMeshNames(req.file.buffer);
          const rot = detectRotation(req.file.buffer);
          db.prepare("UPDATE topics SET model_file=?,builder='glb',rot_x=?,rot_y=?,rot_z=? WHERE id=?")
            .run(fname, rot[0], rot[1], rot[2], newId);
          db.prepare('DELETE FROM topic_parts WHERE topic_id=?').run(newId);
          const ins2 = db.prepare('INSERT INTO topic_parts (topic_id,label,tag,description,mesh_name,sort) VALUES (?,?,?,?,?,?)');
          db.exec('BEGIN');
          try {
            names.forEach((mesh, i) => {
              const nice = mesh.replace(/[_\-.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim().slice(0, 60);
              ins2.run(newId, nice || mesh, '', '', mesh, i + 1);
            });
            db.exec('COMMIT');
          } catch(e3) { db.exec('ROLLBACK'); }
        }
      }

      res.redirect('/admin/topics/' + newId);
    } catch (e) {
      const rows = db.prepare('SELECT * FROM topics ORDER BY sort, id').all();
      const cnt = db.prepare('SELECT COUNT(*) c FROM topic_parts WHERE topic_id=?');
      res.status(400).render('admin/topics', {
        admin: req.session.admin, tables: TABLES, builders: BUILDERS,
        rows: rows.map(r => ({ ...r, nparts: cnt.get(r.id).c })), error: e.message,
      });
    }
  });

  router.post('/topics/:id/delete', (req, res) => {
    const id = intv(req.params.id, { min: 1 });
    db.prepare('DELETE FROM topic_parts WHERE topic_id=?').run(id);
    db.prepare('DELETE FROM topics WHERE id=?').run(id);
    audit(req.session.admin.id, req.session.admin.username, 'topic_delete', '#' + id, req.ip);
    res.redirect('/admin/topics');
  });

  /* ek topic ke parts */
  function topicView(req, res, error) {
    const id = intv(req.params.id, { min: 1 });
    const topic = db.prepare('SELECT * FROM topics WHERE id=?').get(id);
    if (!topic) return res.status(404).send('Topic nahi mila');
    const meta = BUILDERS.find(b => b.key === topic.builder) || {};
    res.render('admin/topic-parts', {
      admin: req.session.admin, tables: TABLES, topic, meta,
      parts: db.prepare('SELECT * FROM topic_parts WHERE topic_id=? ORDER BY sort, id').all(id),
      error: error || null,
    });
  }
  router.get('/topics/:id', (req, res) => topicView(req, res));

  router.post('/topics/:id/part', (req, res) => {
    const tid = intv(req.params.id, { min: 1 });
    try {
      const pid = intv(req.body.pid, { min: 0 });
      const label = str(req.body.label, { min: 1, max: 60, name: 'Part ka naam' });
      const tag = str(req.body.tag, { max: 24 });
      const description = str(req.body.description, { max: 900, name: 'Jaankari' });
      const facts = str(req.body.facts, { max: 300 });
      const sort = intv(req.body.sort, { min: 0, max: 999 });
      if (pid > 0) {
        db.prepare('UPDATE topic_parts SET label=?,tag=?,description=?,facts=?,sort=? WHERE id=? AND topic_id=?')
          .run(label, tag, description, facts, sort, pid, tid);
      } else {
        db.prepare('INSERT INTO topic_parts (topic_id,label,tag,description,facts,sort) VALUES (?,?,?,?,?,?)')
          .run(tid, label, tag, description, facts, sort);
      }
      audit(req.session.admin.id, req.session.admin.username, 'topic_part_save', label, req.ip);
      res.redirect('/admin/topics/' + tid);
    } catch (e) { topicView(req, res, e.message); }
  });

  router.post('/topics/:id/part/:pid/delete', (req, res) => {
    const tid = intv(req.params.id, { min: 1 });
    db.prepare('DELETE FROM topic_parts WHERE id=? AND topic_id=?').run(intv(req.params.pid, { min: 1 }), tid);
    res.redirect('/admin/topics/' + tid);
  });

  /* -------- topic ke liye .glb model upload — upload hote hi sab apne aap -------- */
  router.post('/topics/:id/model', uploadModel.single('file'), checkCsrfAfterUpload, (req, res) => {
    const tid = intv(req.params.id, { min: 1 });
    try {
      if (!req.file) throw new Error('Koi file chuni hi nahi');
      const type = sniffType(req.file.buffer);
      if (type !== 'glb') throw new Error('Sirf .glb file chalegi. (.gltf, .fbx, .obj nahi — pehle .glb me convert karein)');

      // purani file hatao
      const old = db.prepare('SELECT model_file FROM topics WHERE id=?').get(tid);
      if (old?.model_file) {
        const f = path.join(UPLOAD_DIR, path.basename(old.model_file));
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }

      // file save karo
      const fname = safeFilename('glb');
      fs.writeFileSync(path.join(UPLOAD_DIR, fname), req.file.buffer);
      db.prepare("UPDATE topics SET model_file=?, builder='glb' WHERE id=?").run(fname, tid);

      // ---- APNE AAP: GLB ke andar se mesh ke naam nikalo ----
      const names = extractGlbMeshNames(req.file.buffer);

      // ---- APNE AAP: rotation pata karo ----
      const rot = detectRotation(req.file.buffer);
      db.prepare('UPDATE topics SET rot_x=?,rot_y=?,rot_z=? WHERE id=?').run(rot[0], rot[1], rot[2], tid);

      // ---- APNE AAP: purane parts hatao, naye banao ----
      db.prepare('DELETE FROM topic_parts WHERE topic_id=?').run(tid);
      const ins = db.prepare('INSERT INTO topic_parts (topic_id,label,tag,description,mesh_name,sort) VALUES (?,?,?,?,?,?)');
      db.exec('BEGIN');
      try {
        names.forEach((mesh, i) => {
          const nice = mesh.replace(/[_\-.]+/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\s+/g, ' ').trim().slice(0, 60);
          ins.run(tid, nice || mesh, '', '', mesh, i + 1);
        });
        db.exec('COMMIT');
      } catch (e2) { db.exec('ROLLBACK'); throw e2; }

      audit(req.session.admin.id, req.session.admin.username, 'topic_model', `#${tid} ${names.length} parts rot=${rot[0]}`, req.ip);
      res.redirect('/admin/topics/' + tid);
    } catch (e) { topicView(req, res, e.message); }
  });

  /* ---------------- 3D Lab Topics (image-based) — React admin only ----------------
     Har topic ke 4 labeled photo (front/right/back/left) + clickable "parts"
     list. Alag tables (lab_topics / lab_topic_parts) — purane procedural/GLB
     topics system (upar) se bilkul alag, kyunki React /3d-lab page ab yahi
     data /api/lab-topics se lekar dikhata hai. */
  const LAB_ANGLES = ['front', 'right', 'back', 'left'];
  const LAB_IMG_COL = { front: 'img_front', right: 'img_right', back: 'img_back', left: 'img_left' };

  function labTopicRow(id) {
    const t = db.prepare('SELECT * FROM lab_topics WHERE id=?').get(id);
    if (!t) return null;
    return {
      ...t,
      parts: db.prepare('SELECT * FROM lab_topic_parts WHERE topic_id=? ORDER BY sort, id').all(id),
    };
  }

  router.get('/lab-topics', (req, res) => {
    const rows = db.prepare('SELECT * FROM lab_topics ORDER BY sort, id').all();
    const parts = db.prepare('SELECT * FROM lab_topic_parts WHERE topic_id=? ORDER BY sort, id');
    res.json({ rows: rows.map(t => ({ ...t, parts: parts.all(t.id) })) });
  });

  router.post('/lab-topics/save', (req, res) => {
    try {
      const id = intv(req.body.id, { min: 0 });
      const label = str(req.body.label, { min: 1, max: 60, name: 'Topic ka naam' });
      const subject = str(req.body.subject, { max: 30 });
      const sort = intv(req.body.sort, { min: 0, max: 9999, def: 0 });
      const active = req.body.active ? 1 : 0;

      let newId = id;
      if (id > 0) {
        db.prepare('UPDATE lab_topics SET label=?,subject=?,sort=?,active=? WHERE id=?')
          .run(label, subject, sort, active, id);
        audit(req.session.admin.id, req.session.admin.username, 'lab_topic_update', label, req.ip);
      } else {
        let tkey = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'topic';
        while (db.prepare('SELECT 1 FROM lab_topics WHERE tkey=?').get(tkey)) tkey += '-' + Math.floor(Math.random() * 99);
        const nr = db.prepare('INSERT INTO lab_topics (tkey,label,subject,sort,active) VALUES (?,?,?,?,?)')
          .run(tkey, label, subject, sort, active);
        newId = Number(nr.lastInsertRowid);
        audit(req.session.admin.id, req.session.admin.username, 'lab_topic_create', label, req.ip);
      }
      res.json({ ok: true, row: labTopicRow(newId) });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.post('/lab-topics/:id/delete', (req, res) => {
    const id = intv(req.params.id, { min: 1 });
    const row = db.prepare('SELECT * FROM lab_topics WHERE id=?').get(id);
    if (row) {
      for (const a of LAB_ANGLES) {
        const fname = row[LAB_IMG_COL[a]];
        if (fname) {
          const f = path.join(UPLOAD_DIR, path.basename(fname));
          if (fs.existsSync(f)) fs.unlinkSync(f);
        }
      }
    }
    db.prepare('DELETE FROM lab_topic_parts WHERE topic_id=?').run(id);
    db.prepare('DELETE FROM lab_topics WHERE id=?').run(id);
    audit(req.session.admin.id, req.session.admin.username, 'lab_topic_delete', '#' + id, req.ip);
    res.json({ ok: true, id });
  });

  /* ek angle (front/right/back/left) ki photo upload */
  router.post('/lab-topics/:id/image', upload.single('file'), checkCsrfAfterUpload, (req, res) => {
    const id = intv(req.params.id, { min: 1 });
    try {
      const angle = String(req.body.angle || '');
      if (!LAB_ANGLES.includes(angle)) throw new Error('Angle sahi nahi hai');
      if (!req.file) throw new Error('Koi photo chuni hi nahi');
      const type = sniffType(req.file.buffer);
      if (!IMAGE_TYPES.includes(type)) throw new Error('Sirf JPG, PNG ya WEBP photo chalegi');

      const row = db.prepare('SELECT * FROM lab_topics WHERE id=?').get(id);
      if (!row) throw new Error('Topic nahi mila');
      const col = LAB_IMG_COL[angle];
      if (row[col]) {
        const old = path.join(UPLOAD_DIR, path.basename(row[col]));
        if (fs.existsSync(old)) fs.unlinkSync(old);
      }

      const fname = safeFilename(type);
      fs.writeFileSync(path.join(UPLOAD_DIR, fname), req.file.buffer);
      db.prepare(`UPDATE lab_topics SET ${col}=? WHERE id=?`).run(fname, id);
      audit(req.session.admin.id, req.session.admin.username, 'lab_topic_image', `#${id} ${angle}`, req.ip);
      res.json({ ok: true, id, angle, filename: fname, row: labTopicRow(id) });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.post('/lab-topics/:id/image/:angle/delete', (req, res) => {
    const id = intv(req.params.id, { min: 1 });
    const angle = String(req.params.angle || '');
    if (!LAB_ANGLES.includes(angle)) return res.status(400).json({ ok: false, error: 'Angle sahi nahi hai' });
    const row = db.prepare('SELECT * FROM lab_topics WHERE id=?').get(id);
    if (!row) return res.status(404).json({ ok: false, error: 'Topic nahi mila' });
    const col = LAB_IMG_COL[angle];
    if (row[col]) {
      const f = path.join(UPLOAD_DIR, path.basename(row[col]));
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    db.prepare(`UPDATE lab_topics SET ${col}='' WHERE id=?`).run(id);
    audit(req.session.admin.id, req.session.admin.username, 'lab_topic_image_delete', `#${id} ${angle}`, req.ip);
    res.json({ ok: true, id, angle, row: labTopicRow(id) });
  });

  /* topic ke parts (clickable labels) */
  router.post('/lab-topics/:id/parts/save', (req, res) => {
    const tid = intv(req.params.id, { min: 1 });
    try {
      if (!db.prepare('SELECT 1 FROM lab_topics WHERE id=?').get(tid)) throw new Error('Topic nahi mila');
      const pid = intv(req.body.pid, { min: 0 });
      const label = str(req.body.label, { min: 1, max: 60, name: 'Part ka naam' });
      const tag = str(req.body.tag, { max: 24 });
      const description = str(req.body.description, { max: 900, name: 'Jaankari' });
      const facts = str(req.body.facts, { max: 300 });
      const sort = intv(req.body.sort, { min: 0, max: 999, def: 0 });
      let newPid = pid;
      if (pid > 0) {
        db.prepare('UPDATE lab_topic_parts SET label=?,tag=?,description=?,facts=?,sort=? WHERE id=? AND topic_id=?')
          .run(label, tag, description, facts, sort, pid, tid);
      } else {
        const r = db.prepare('INSERT INTO lab_topic_parts (topic_id,label,tag,description,facts,sort) VALUES (?,?,?,?,?,?)')
          .run(tid, label, tag, description, facts, sort);
        newPid = Number(r.lastInsertRowid);
      }
      audit(req.session.admin.id, req.session.admin.username, 'lab_topic_part_save', label, req.ip);
      res.json({ ok: true, part: db.prepare('SELECT * FROM lab_topic_parts WHERE id=?').get(newPid), row: labTopicRow(tid) });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  router.post('/lab-topics/:id/parts/:pid/delete', (req, res) => {
    const tid = intv(req.params.id, { min: 1 });
    const pid = intv(req.params.pid, { min: 1 });
    db.prepare('DELETE FROM lab_topic_parts WHERE id=? AND topic_id=?').run(pid, tid);
    audit(req.session.admin.id, req.session.admin.username, 'lab_topic_part_delete', `#${pid}`, req.ip);
    res.json({ ok: true, id: pid, row: labTopicRow(tid) });
  });

  /* ---------------- website ki photos ---------------- */
  router.get('/photos', (req, res) => {
    if (wantsJson(req)) return res.json({ slots: IMAGE_SLOTS, imgs: allImages() });
    res.render('admin/photos', {
      admin: req.session.admin, tables: TABLES,
      slots: IMAGE_SLOTS, imgs: allImages(), error: null,
    });
  });

  router.post('/photos', upload.single('file'), checkCsrfAfterUpload, (req, res) => {
    const render = (error) => {
      if (wantsJson(req)) return res.status(400).json({ ok: false, error });
      res.render('admin/photos', {
        admin: req.session.admin, tables: TABLES, slots: IMAGE_SLOTS, imgs: allImages(), error,
      });
    };
    try {
      const slot = String(req.body.slot || '');
      if (!IMAGE_SLOTS.some(s => s.slot === slot)) throw new Error('Aisi koi jagah nahi hai');
      if (!req.file) throw new Error('Koi photo chuni hi nahi');

      const type = sniffType(req.file.buffer);
      if (!IMAGE_TYPES.includes(type)) throw new Error('Sirf JPG, PNG ya WEBP photo chalegi');

      // purani photo hata do
      const old = db.prepare('SELECT filename FROM images WHERE slot=?').get(slot);
      if (old?.filename) {
        const f = path.join(UPLOAD_DIR, path.basename(old.filename));
        if (fs.existsSync(f)) fs.unlinkSync(f);
      }

      const fname = safeFilename(type);
      fs.writeFileSync(path.join(UPLOAD_DIR, fname), req.file.buffer);
      db.prepare(`INSERT INTO images (slot,filename,updated_at) VALUES (?,?,?)
                  ON CONFLICT(slot) DO UPDATE SET filename=excluded.filename, updated_at=excluded.updated_at`)
        .run(slot, fname, Date.now());
      audit(req.session.admin.id, req.session.admin.username, 'photo_upload', slot, req.ip);
      if (wantsJson(req)) return res.json({ ok: true, slot, filename: fname });
      res.redirect('/admin/photos');
    } catch (e) { render(e.message); }
  });

  router.post('/photos/:slot/delete', (req, res) => {
    const slot = String(req.params.slot || '');
    const row = db.prepare('SELECT filename FROM images WHERE slot=?').get(slot);
    if (row?.filename) {
      const f = path.join(UPLOAD_DIR, path.basename(row.filename));
      if (fs.existsSync(f)) fs.unlinkSync(f);
    }
    db.prepare('DELETE FROM images WHERE slot=?').run(slot);
    audit(req.session.admin.id, req.session.admin.username, 'photo_delete', slot, req.ip);
    if (wantsJson(req)) return res.json({ ok: true, slot });
    res.redirect('/admin/photos');
  });

  /* ---------------- audit log ---------------- */
  router.get('/log', (req, res) => {
    res.render('admin/log', {
      admin: req.session.admin, tables: TABLES,
      rows: db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300').all(),
    });
  });

  return router;
};
