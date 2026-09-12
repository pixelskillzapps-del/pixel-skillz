/* =====================================================================
   routes/public.js — website ke saare page
   Har page ka apna raasta (URL) aur apni file views/pages/ me hai.
   ===================================================================== */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { db, allSettings, allImages, topicsForApi, labTopicsForApi } = require('../db');
const { str, phone10 } = require('../security');

module.exports = function (enquiryLimit) {
  const router = express.Router();

  const Q = {
    toppers: db.prepare('SELECT * FROM toppers WHERE active=1 AND groupname=? ORDER BY sort, id'),
    courses: db.prepare('SELECT * FROM courses WHERE active=1 ORDER BY sort, id'),
    faculty: db.prepare('SELECT * FROM faculty WHERE active=1 ORDER BY sort, id'),
    testimonials: db.prepare('SELECT * FROM testimonials WHERE active=1 ORDER BY sort, id'),
    fees: db.prepare('SELECT * FROM fees WHERE active=1 ORDER BY sort, id'),
    notes: db.prepare('SELECT * FROM notes WHERE active=1 ORDER BY sort, id'),
    faqs: db.prepare('SELECT * FROM faqs WHERE active=1 ORDER BY sort, id'),
  };

  /* har page ko saara data mil jaata hai — kis page ko kya dikhana hai,
     wo uska apna template tay karta hai */
  function data(page, title) {
    return {
      page, pageTitle: title,
      s: allSettings(),
      imgs: allImages(),
      boardToppers: Q.toppers.all('board'),
      compToppers: Q.toppers.all('computer'),
      courses: Q.courses.all(),
      faculty: Q.faculty.all(),
      testimonials: Q.testimonials.all(),
      fees: Q.fees.all(),
      notes: Q.notes.all(),
      faqs: Q.faqs.all(),
      year: new Date().getFullYear(),
    };
  }

  /* -----------------------------------------------------------------
     PAGE KI LIST
     Naya page jodna ho to yahan ek line jodein aur
     views/pages/ me usi naam ki .ejs file bana dein. Bas.
     ----------------------------------------------------------------- */
  const PAGES = [
    { url: '/',         view: 'home',     title: 'Home' },
    { url: '/about',    view: 'about',    title: 'Hamare Baare Me' },
    { url: '/courses',  view: 'courses',  title: 'Courses' },
    { url: '/computer', view: 'computer', title: 'Computer & BCA Classes' },
    { url: '/3d-lab',   view: 'lab',      title: '3D Learning Lab' },
    { url: '/results',  view: 'results',  title: 'Results' },
    { url: '/fees',     view: 'fees',     title: 'Fees' },
    { url: '/faculty',  view: 'faculty',  title: 'Faculty' },
    { url: '/notes',    view: 'notes',    title: 'Free Study Material' },
    { url: '/faq',      view: 'faq',      title: 'FAQ' },
    { url: '/contact',  view: 'contact',  title: 'Contact' },
  ];

  for (const p of PAGES) {
    router.get(p.url, (req, res) => res.render('pages/' + p.view, data(p.view, p.title)));
  }

  /* -------- enquiry form (dono form isi par aate hain) -------- */
  router.post('/enquiry', enquiryLimit, (req, res) => {
    try {
      // honeypot: asli insaan ye chhupa hua field nahi bharta, bot bharta hai
      if (str(req.body.website, { max: 100 })) {
        return res.json({ ok: true, message: 'Dhanyavaad!' });
      }

      const name = str(req.body.name, { min: 2, max: 80, name: 'Naam' });
      const phone = phone10(req.body.phone);
      const course = str(req.body.course, { max: 80 });
      const time_pref = str(req.body.time_pref, { max: 40 });
      const message = str(req.body.message, { max: 600 });
      const source = str(req.body.source, { max: 30 }) || 'website';

      const recent = db.prepare(
        'SELECT id FROM leads WHERE phone=? AND created_at > ? ORDER BY id DESC LIMIT 1'
      ).get(phone, Date.now() - 10 * 60 * 1000);

      if (recent) {
        db.prepare('UPDATE leads SET name=?,course=?,time_pref=?,message=? WHERE id=?')
          .run(name, course, time_pref, message, recent.id);
      } else {
        db.prepare('INSERT INTO leads (name,phone,course,time_pref,message,source,ip,created_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(name, phone, course, time_pref, message, source,
               String(req.ip || '').slice(0, 60), Date.now());
      }

      const s = allSettings();
      const text = encodeURIComponent(
        'Namaste ' + s.institute_name + ',\n\nNaam: ' + name + '\nMobile: ' + phone + '\n' +
        'Class/Course: ' + course + '\n' + (time_pref ? 'Time: ' + time_pref + '\n' : '') +
        (message ? 'Baat: ' + message + '\n' : '') + '\nMujhe free demo class chahiye.'
      );

      res.json({
        ok: true,
        message: 'Mil gaya! Hum aaj hi call karenge.',
        whatsapp: s.whatsapp ? 'https://wa.me/' + s.whatsapp + '?text=' + text : null,
      });
    } catch (e) {
      res.status(400).json({ ok: false, error: e.message });
    }
  });

  /* -------- notes download -------- */
  router.get('/notes/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id)) return res.status(404).send('File nahi mili');
    const note = db.prepare('SELECT * FROM notes WHERE id=? AND active=1').get(id);
    if (!note || !note.filename) return res.status(404).send('File nahi mili');

    const safe = path.basename(note.filename);           // ../ se bachav
    const file = path.join(__dirname, '..', '..', 'public', 'uploads', safe);
    if (!fs.existsSync(file)) return res.status(404).send('File nahi mili');

    db.prepare('UPDATE notes SET downloads = downloads + 1 WHERE id=?').run(id);
    res.download(file, (note.original || safe).replace(/[^\w.\- ]/g, '_'));
  });

  /* -------- Google ke liye -------- */
  router.get('/sitemap.xml', (req, res) => {
    const base = req.protocol + '://' + req.get('host');
    const urls = PAGES.map(p => '  <url><loc>' + base + p.url + '</loc></url>').join('\n');
    res.type('application/xml').send(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>'
    );
  });
  router.get('/robots.txt', (req, res) => {
    res.type('text/plain').send('User-agent: *\nDisallow: /admin\nSitemap: ' +
      req.protocol + '://' + req.get('host') + '/sitemap.xml\n');
  });
  /* -------- 3D lab ka data (lab.js yahi maangta hai) -------- */
  router.get('/api/topics', (req, res) => {
    res.set('Cache-Control', 'no-store').json(topicsForApi());
  });

  /* -------- 3D Learning Lab, image-based version — React LabViewer yahi
     se topics leta hai, admin panel ke "3D Lab Topics" se manage hota hai -------- */
  router.get('/api/lab-topics', (req, res) => {
    res.set('Cache-Control', 'no-store').json(labTopicsForApi());
  });

  /* -------- React frontend (SPA) ke liye theme naam: DB me 'p-a' store hota
     hai, React ki CSS ".theme-a" expect karti hai -------- */
  const shortTheme = (t) => String(t || 'p-a').replace(/^p-/, '') || 'a';
  const lines = (s) => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);

  function courseForApi(r) {
    return {
      slug: r.slug, title: r.title,
      badge1: r.badge1, badge2: r.badge2, meta1: r.meta1, meta2: r.meta2,
      theme: shortTheme(r.theme),
      photo: r.photo ? '/uploads/' + r.photo : null,
      heroIcon: r.hero_icon ? '/uploads/' + r.hero_icon : null,
      tagline: r.tagline, duration: r.duration, topicWord: r.topic_word,
      description: r.description, fees: r.fees_text,
      syllabus: { beginner: lines(r.syllabus_beginner), advanced: lines(r.syllabus_advanced) },
    };
  }

  /* -------- saare courses (carousel, hero orbit, course cards ke liye) -------- */
  router.get('/api/courses', (req, res) => {
    const rows = db.prepare("SELECT * FROM courses WHERE active=1 AND slug != '' ORDER BY sort, id").all();
    res.set('Cache-Control', 'no-store').json(rows.map(courseForApi));
  });

  /* -------- ek course ki poori jaankari, slug se (course detail page ke liye) -------- */
  router.get('/api/courses/:slug', (req, res) => {
    const row = db.prepare('SELECT * FROM courses WHERE slug=? AND active=1').get(req.params.slug);
    if (!row) return res.status(404).json({ ok: false, error: 'Course nahi mila' });
    res.set('Cache-Control', 'no-store').json(courseForApi(row));
  });

  /* -------- React frontend ke liye ek hi jagah se poora site data —
     settings, photos, toppers, faculty, testimonials, fees, notes, faqs.
     Sab kuch admin panel se hi aata hai, koi hardcoded data nahi. -------- */
  router.get('/api/site', (req, res) => {
    const courses = db.prepare("SELECT * FROM courses WHERE active=1 AND slug != '' ORDER BY sort, id").all().map(courseForApi);
    const faculty = Q.faculty.all().map(f => ({
      name: f.name, subject: f.subject, detail: f.detail, initials: f.initials,
      theme: shortTheme(f.theme), photo: f.photo ? '/uploads/' + f.photo : null,
    }));
    const testimonials = Q.testimonials.all().map(t => ({
      name: t.name, role: t.role, quote: t.quote, stars: t.stars,
      initials: t.initials, theme: shortTheme(t.theme),
    }));
    const fees = Q.fees.all().map(f => ({ batch: f.batch, timing: f.timing, days: f.days, amount: f.amount }));
    const faqs = Q.faqs.all().map(f => ({ question: f.question, answer: f.answer }));
    const notes = Q.notes.all().map(n => ({ id: n.id, title: n.title, meta: n.meta, hasFile: !!n.filename }));
    const mapTopper = (t) => ({
      name: t.name, school: t.school, score: t.score, klass: t.klass,
      theme: shortTheme(t.theme), photo: t.photo ? '/uploads/' + t.photo : null,
    });

    res.set('Cache-Control', 'no-store').json({
      settings: allSettings(),
      images: allImages(),
      courses, faculty, testimonials, fees, faqs, notes,
      toppers: { board: Q.toppers.all('board').map(mapTopper), computer: Q.toppers.all('computer').map(mapTopper) },
    });
  });

  router.get('/health', (req, res) => res.json({ ok: true }));

  return router;
};
