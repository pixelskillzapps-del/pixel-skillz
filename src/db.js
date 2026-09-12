/* =====================================================================
   db.js — SQLite database, schema aur shuruaati data
   ===================================================================== */
const { DatabaseSync } = require('node:sqlite');   // Node me pehle se aata hai
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const UPLOAD_DIR = path.join(__dirname, '..', 'data', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'pixelskillz.db'));
db.exec('PRAGMA journal_mode = WAL');   // ek saath padhne-likhne me tez
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS images (
  slot       TEXT PRIMARY KEY,
  filename   TEXT NOT NULL DEFAULT '',
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  username       TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  name           TEXT NOT NULL DEFAULT '',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until   INTEGER NOT NULL DEFAULT 0,
  last_login     INTEGER,
  must_change    INTEGER NOT NULL DEFAULT 1,
  created_at     INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS toppers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, school TEXT NOT NULL DEFAULT '',
  score TEXT NOT NULL DEFAULT '', klass TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'p-a', groupname TEXT NOT NULL DEFAULT 'board',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, badge1 TEXT NOT NULL DEFAULT '',
  badge2 TEXT NOT NULL DEFAULT '', meta1 TEXT NOT NULL DEFAULT '',
  meta2 TEXT NOT NULL DEFAULT '', theme TEXT NOT NULL DEFAULT 'p-a',
  slug TEXT NOT NULL DEFAULT '', photo TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS faculty (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, subject TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '', initials TEXT NOT NULL DEFAULT '',
  theme TEXT NOT NULL DEFAULT 'p-a',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, role TEXT NOT NULL DEFAULT '',
  quote TEXT NOT NULL, stars INTEGER NOT NULL DEFAULT 5,
  initials TEXT NOT NULL DEFAULT '', theme TEXT NOT NULL DEFAULT 'p-a',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS fees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch TEXT NOT NULL, timing TEXT NOT NULL DEFAULT '',
  days TEXT NOT NULL DEFAULT '', amount TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '',
  filename TEXT NOT NULL DEFAULT '', original TEXT NOT NULL DEFAULT '',
  downloads INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL, answer TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tkey TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  builder TEXT NOT NULL DEFAULT 'layers',
  dist REAL NOT NULL DEFAULT 9.5,
  subject TEXT NOT NULL DEFAULT 'Science',
  model_file TEXT NOT NULL DEFAULT '',
  rot_x REAL NOT NULL DEFAULT 0,
  rot_y REAL NOT NULL DEFAULT 0,
  rot_z REAL NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS topic_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  facts TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  mesh_name TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_parts_topic ON topic_parts(topic_id, sort);

CREATE TABLE IF NOT EXISTS lab_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tkey TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  img_front TEXT NOT NULL DEFAULT '',
  img_right TEXT NOT NULL DEFAULT '',
  img_back  TEXT NOT NULL DEFAULT '',
  img_left  TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS lab_topic_parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  facts TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (topic_id) REFERENCES lab_topics(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_lab_parts_topic ON lab_topic_parts(topic_id, sort);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, phone TEXT NOT NULL,
  course TEXT NOT NULL DEFAULT '', time_pref TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT 'website',
  status TEXT NOT NULL DEFAULT 'naya',
  ip TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id INTEGER, username TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '',
  ip TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
`);

/* purani database me naye column jodna (bina data khoye) */
for (const [table, col] of [['faculty', 'photo'], ['toppers', 'photo'],
                            ['courses', 'photo'], ['courses', 'slug'],
                            ['courses', 'tagline'], ['courses', 'duration'],
                            ['courses', 'topic_word'], ['courses', 'description'],
                            ['courses', 'syllabus_beginner'], ['courses', 'syllabus_advanced'],
                            ['courses', 'fees_text'], ['courses', 'hero_icon'],
                            ['topics', 'model_file'], ['topic_parts', 'mesh_name']]) {
  const has = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
  if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} TEXT NOT NULL DEFAULT ''`);
}
for (const col of ['rot_x', 'rot_y', 'rot_z']) {
  const has = db.prepare('PRAGMA table_info(topics)').all().some(c => c.name === col);
  if (!has) db.exec(`ALTER TABLE topics ADD COLUMN ${col} REAL NOT NULL DEFAULT 0`);
}

/* course slugs — website ke /courses/:slug ke saath match karne ke liye.
   Purani rows (jo already seed ho chuki hain) me title se slug backfill
   karte hain. Naye DB me seedIfEmpty('courses', ...) apne saath slug
   already leke aata hai (neeche), aur jo 3 course kabhi is table me the
   hi nahi (frontend ke Computer page wale) unhe seed() ke andar jod
   diya jaata hai. */
{
  const SLUG_BY_TITLE = {
    'Class 9–10 Board Foundation': 'class-9-10',
    'Class 11–12 · Science / Commerce / Arts': 'class-11-12',
    'C · C++ · Java Programming': 'c-cpp-java',
    'DBMS + SQL': 'dbms-sql',
    'Web Development — HTML, CSS, JS': 'web-dev',
    'Class 1–8 Foundation': 'class-1-8',
  };
  const setSlug = db.prepare("UPDATE courses SET slug=? WHERE title=? AND (slug IS NULL OR slug='')");
  for (const [title, slug] of Object.entries(SLUG_BY_TITLE)) setSlug.run(slug, title);
}

/* course detail page (tagline/description/syllabus/etc.) — pehli baar ke liye
   default likhawat. Sirf tab likhte hain jab description khaali ho, taaki
   admin ke edit kabhi overwrite na hon. */
{
  const COURSE_DETAILS = {
    'class-1-8': { tagline: 'Neev Mazboot · Poora Saal', topic_word: 'FOUNDATION', duration: 'Poora Saal · Mon–Sat', fees_text: '₹700 – ₹1,000 / mahina (class ke hisaab se)',
      description: 'Chhote bachchon ki padhai ki neev yahan se shuru hoti hai. Hindi, English, Maths ki basic samajh mazboot karwaayi jaati hai, taaki aage ki classes me koi dikkat na aaye.',
      syllabus_beginner: 'Hindi & English — reading aur likhna\nGinti aur basic calculation\nEVS ke shuruaati concept\nHandwriting practice',
      syllabus_advanced: 'Grammar aur comprehension\nMaths — tables, fractions ki neev\nScience ke chapter-wise concept\nChapter-end test practice' },
    'class-9-10': { tagline: 'Experienced Faculty · Poora Saal', topic_word: 'BOARD', duration: 'Poora Saal · 6:00 – 7:30 PM', fees_text: '₹1,400 / mahina',
      description: 'Board exam ki taiyari sirf last saal nahi, shuru se honi chahiye. Yahan NCERT base rakhkar, board ke pattern wale extra questions bhi roz karwaye jaate hain.',
      syllabus_beginner: 'NCERT chapter-wise basics\nFormula aur definitions\nDiagram-based Biology/Physics\nBasic numericals',
      syllabus_advanced: 'Board-pattern practice papers\nPrevious year questions\nAdvanced level numericals\nFull-syllabus mock tests' },
    'class-11-12': { tagline: 'Teeno Stream · Poora Saal', topic_word: 'STREAM', duration: 'Poora Saal · Stream ke hisaab se slot', fees_text: '₹1,800 – ₹2,200 / mahina',
      description: 'Teeno stream — Science, Commerce, Arts — ke liye alag-alag batch. Stream chunne me confusion ho to counselling bhi free milti hai, saath me board pattern ki practice.',
      syllabus_beginner: 'Stream ki core concepts\nNCERT-based foundation\nBasic theory aur numericals\nChapter-wise weekly test',
      syllabus_advanced: 'Board-pattern practice papers\nCase-study based questions (Commerce/Arts)\nCompetitive-level practice (Science)\nFull-syllabus mock tests' },
    'c-cpp-java': { tagline: 'Lab Included · 4 Mahine', topic_word: 'C++', duration: '4 Mahine · Lab ke saath', fees_text: '₹1,200 / mahina',
      description: 'Logic building se shuru hokar OOPs tak — har chapter ke baad usi din machine par practical karwaya jaata hai, taaki concept sirf kitaab tak simit na rahe.',
      syllabus_beginner: 'Variables, loops & conditionals\nArrays & functions\nBasic input/output\nSimple logic-building programs',
      syllabus_advanced: 'OOPs — classes & objects\nPointers & memory (C/C++)\nException handling (Java)\nChhota project banana' },
    'dbms-sql': { tagline: 'BCA Syllabus · 3 Mahine', topic_word: 'SQL', duration: '3 Mahine · Lab included', fees_text: '₹1,200 / mahina',
      description: 'ER diagram banane se lekar complex SQL query likhne tak — BCA ke exact syllabus ke hisaab se, unit-wise padhaya jaata hai.',
      syllabus_beginner: 'Database basics & ER diagrams\nTables, keys & relationships\nBasic SQL — SELECT, WHERE, ORDER BY\nData types aur constraints',
      syllabus_advanced: 'Joins & subqueries\nNormalization (1NF – 3NF)\nStored procedures & triggers\nReal database design project' },
    'web-dev': { tagline: 'Project ke saath · 3 Mahine', topic_word: 'WEB', duration: '3 Mahine · 1 project ke saath', fees_text: '₹1,200 / mahina',
      description: 'Course khatam hone tak student apni khud ki website bana chuka hota hai — portfolio ke liye ready. HTML se JavaScript tak, sab kuch practical ke saath.',
      syllabus_beginner: 'HTML5 — tags & structure\nCSS — styling & layout\nBasic JavaScript syntax\nChhote practice pages',
      syllabus_advanced: 'Responsive design (Flexbox/Grid)\nDOM manipulation\nForms & basic validation\nApni khud ki website — end-to-end' },
    'computer-basics': { tagline: 'Beginner · 3 Mahine', topic_word: 'COMPUTER', duration: '3 Mahine · Lab included', fees_text: '₹1,200 / mahina',
      description: 'Bilkul shuruaat se — computer ke parts, Windows chalana, aur MS Office ke teeno tools (Word, Excel, PowerPoint) practical ke saath sikhaaye jaate hain.',
      syllabus_beginner: 'Computer hardware ke basic parts\nWindows aur file management\nTyping practice\nInternet ka safe istemaal',
      syllabus_advanced: 'MS Word — formatting & documents\nMS Excel — formulas & tables\nMS PowerPoint — presentations\nEmail aur basic troubleshooting' },
    'data-structures-python': { tagline: 'Core CS · 4 Mahine', topic_word: 'PYTHON', duration: '4 Mahine · Lab included', fees_text: '₹1,200 / mahina',
      description: 'Array, linked list, stack, queue jaise core data structures, saath me Python ki basic se intermediate programming — dono ek hi course me.',
      syllabus_beginner: 'Python syntax & variables\nLoops & conditionals\nLists, tuples & dictionaries\nFunctions ki basics',
      syllabus_advanced: 'Arrays, stacks & queues\nLinked lists\nSorting & searching algorithms\nChhote projects Python me' },
    'bca-doubt-class': { tagline: 'Support · Per Semester', topic_word: 'BCA', duration: 'Per semester · Exam se pehle', fees_text: 'Subject ke hisaab se',
      description: 'College exam se pehle unit-wise revision aur practical file banwane me poori madad — jo bhi semester subject me atka ho, wahi cover karte hain.',
      syllabus_beginner: 'Semester subjects ka revision\nImportant topics ki list\nConcept clarity sessions\nBasic doubt solving',
      syllabus_advanced: 'Previous year paper solving\nPractical file banwana\nViva preparation\nExam-time crash revision' },
  };
  const setDetail = db.prepare(`UPDATE courses SET tagline=?, duration=?, topic_word=?, description=?,
    syllabus_beginner=?, syllabus_advanced=?, fees_text=?
    WHERE slug=? AND (description IS NULL OR description='')`);
  for (const [slug, d] of Object.entries(COURSE_DETAILS)) {
    setDetail.run(d.tagline, d.duration, d.topic_word, d.description, d.syllabus_beginner, d.syllabus_advanced, d.fees_text, slug);
  }
}

/* ---------- photo slots — website ki fix jagah ---------- */
const IMAGE_SLOTS = [
  { slot: 'hero1',  label: 'Home — collage photo 1',  hint: 'Classroom ki photo' },
  { slot: 'hero2',  label: 'Home — collage photo 2',  hint: 'Students ki photo' },
  { slot: 'hero3',  label: 'Home — collage photo 3',  hint: 'Computer lab' },
  { slot: 'hero4',  label: 'Home — collage photo 4',  hint: 'Toppers ki photo' },
  { slot: 'about1', label: 'About — badi photo',      hint: 'Classroom ya building' },
  { slot: 'about2', label: 'About — chhoti photo',    hint: 'Teacher ki photo' },
  { slot: 'faq1',   label: 'FAQ — photo 1',           hint: 'Doubt class' },
  { slot: 'faq2',   label: 'FAQ — photo 2',           hint: 'Students' },
  { slot: 'ctaL',   label: 'Rangeen patti — baayein', hint: 'Koi bhi photo' },
  { slot: 'ctaR',   label: 'Rangeen patti — daayein', hint: 'Koi bhi photo' },
  { slot: 'heroVisual', label: 'Home — hero ka beech wala visual', hint: 'Laptop mockup ki jagah dikhega, uske andar fit hokar' },

  /* floating decorative illustrations — jahan bhi ye graphic dikhta hai (kayi
     page par reuse hota hai), sab jagah apne aap badal jaayega */
  { slot: 'illust_laptop',   label: 'Illustration — Laptop', hint: 'Home ke "Aap Kya Dhoondh Rahe Hain" section me' },
  { slot: 'illust_notebook', label: 'Illustration — Notebook', hint: 'Testimonials section me (kayi page par)' },
  { slot: 'illust_browser',  label: 'Illustration — Browser', hint: 'Computer & BCA page me' },
  { slot: 'illust_cap',      label: 'Illustration — Graduation Cap', hint: 'Results banner me (kayi page par)' },

  /* CTA band ka mascot + graduation cap — har page ke neeche wale band me */
  { slot: 'mascotStudent', label: 'CTA band — student mascot', hint: 'Har page ke neeche wale "Get Started" band me' },
  { slot: 'mascotGradcap', label: 'CTA band — graduation cap', hint: 'Usi CTA band me, upar-daayein' },

  /* tile hexagon icons — jahan bhi ye icon dikhta hai (ek se zyada tile/page
     par ho sakta hai), sab jagah apne aap badal jaayega */
  { slot: 'icon_hex',      label: 'Icon — Class 1–5', hint: 'Home ke tiles me' },
  { slot: 'icon_plus',     label: 'Icon — Class 6–8', hint: 'Home ke tiles me' },
  { slot: 'icon_cap',      label: 'Icon — Class 9–10', hint: 'Home ke tiles me' },
  { slot: 'icon_bars',     label: 'Icon — Class 11–12', hint: 'Home ke tiles me' },
  { slot: 'icon_monitor',  label: 'Icon — Computer / Computer Lab', hint: 'Home aur Fees/Courses ke tiles me' },
  { slot: 'icon_code',     label: 'Icon — C · C++ · Java', hint: 'Home ke tiles me' },
  { slot: 'icon_db',       label: 'Icon — DBMS & SQL', hint: 'Home ke tiles me' },
  { slot: 'icon_globe',    label: 'Icon — Web Development', hint: 'Home ke tiles me' },
  { slot: 'icon_cube',     label: 'Icon — 3D Learning', hint: 'Home/About/Faculty ke tiles me' },
  { slot: 'icon_notes',    label: 'Icon — Free Notes', hint: 'Home ke tiles me' },
  { slot: 'icon_list',     label: 'Icon — Regular Batch', hint: 'Home/Fees/Courses ke "Hum Kya Dete Hain" tiles me' },
  { slot: 'icon_bolt',     label: 'Icon — Crash Course', hint: 'Home/Fees/Courses ke tiles me' },
  { slot: 'icon_check',    label: 'Icon — Board Revision / Har hafte test', hint: 'Kayi page ke tiles me' },
  { slot: 'icon_question', label: 'Icon — Doubt Batch', hint: 'Home/Fees/Courses ke tiles me' },
  { slot: 'icon_home',     label: 'Icon — Home Tuition', hint: 'Home/Fees/Courses ke tiles me' },
  { slot: 'icon_chat',     label: 'Icon — Counselling', hint: 'Home/Fees/Courses ke tiles me' },
  { slot: 'icon_person',   label: 'Icon — Batch me sirf 18 seat', hint: 'Home/About/Faculty ke "Why Choose" tiles me' },
  { slot: 'icon_pencil',   label: 'Icon — Roz homework check', hint: 'Home/About/Faculty ke tiles me' },
  { slot: 'icon_clock',    label: 'Icon — Doubt class free', hint: 'Home/About/Faculty ke tiles me' },
  { slot: 'icon_doc',      label: 'Icon — Parents ko report', hint: 'Home/About/Faculty ke tiles me' },
  { slot: 'icon_cart',     label: 'Icon — Course card (photo na ho tab)', hint: 'Popular Courses carousel me, jab course ki apni photo na ho' },
];

/* 3D model ke saanche — geometry code me hai, likhawat database me */
const BUILDERS = [
  { key: 'heart',    label: 'Dil (detail wala)',            parts: 10, fixed: true },
  { key: 'computer', label: 'Computer / CPU (detail wala)', parts: 8,  fixed: true },
  { key: 'cell',     label: 'Cell (detail wala)',           parts: 7,  fixed: true },
  { key: 'atom',     label: 'Atom (detail wala)',           parts: 6,  fixed: true },
  { key: 'eye',      label: 'Aankh (detail wali)',          parts: 8,  fixed: true },
  { key: 'lungs',    label: 'Phephde (detail wale)',        parts: 6,  fixed: true },
  { key: 'dna',      label: 'DNA (detail wala)',            parts: 5,  fixed: true },
  { key: 'layers',   label: 'Parat-dar gola — jitne part chahein', parts: 0, fixed: false },
  { key: 'orbit',    label: 'Chakkar lagane wala — jitne part chahein', parts: 0, fixed: false },
  { key: 'stack',    label: 'Tah-dar (ek ke upar ek) — jitne part chahein', parts: 0, fixed: false },
  { key: 'glb',      label: 'Apni 3D file (.glb) — Sketchfab wagairah se', parts: 0, fixed: false, needsFile: true },
];

function topicsForApi() {
  const ts = db.prepare('SELECT * FROM topics WHERE active=1 ORDER BY sort, id').all();
  const ps = db.prepare('SELECT * FROM topic_parts WHERE topic_id=? ORDER BY sort, id');
  return ts.map(t => ({
    key: t.tkey, label: t.label, builder: t.builder, dist: t.dist, subject: t.subject,
    model: t.model_file ? '/uploads/' + t.model_file : '',
    rot: [t.rot_x || 0, t.rot_y || 0, t.rot_z || 0],
    parts: ps.all(t.id).map(p => ({
      label: p.label, tag: p.tag, desc: p.description,
      facts: p.facts ? p.facts.split('|').map(s => s.trim()).filter(Boolean) : [],
      color: p.color, mesh: p.mesh_name,
    })),
  })).filter(t => t.parts.length > 0);
}

/* ---------- image-based 3D Learning Lab topics ---------- */
const LAB_ANGLES = ['front', 'right', 'back', 'left'];

function labTopicsForApi() {
  const ts = db.prepare('SELECT * FROM lab_topics WHERE active=1 ORDER BY sort, id').all();
  const ps = db.prepare('SELECT * FROM lab_topic_parts WHERE topic_id=? ORDER BY sort, id');
  return ts.map(t => ({
    key: t.tkey, label: t.label, subject: t.subject,
    images: {
      front: t.img_front ? '/uploads/' + t.img_front : '',
      right: t.img_right ? '/uploads/' + t.img_right : '',
      back:  t.img_back  ? '/uploads/' + t.img_back  : '',
      left:  t.img_left  ? '/uploads/' + t.img_left  : '',
    },
    parts: ps.all(t.id).map(p => ({
      label: p.label, tag: p.tag, desc: p.description,
      facts: p.facts ? p.facts.split('|').map(s => s.trim()).filter(Boolean) : [],
    })),
  }));
}

function allImages() {
  const out = {};
  for (const r of db.prepare('SELECT slot,filename FROM images').all()) out[r.slot] = r.filename;
  return out;
}

/* ---------- settings helpers ---------- */
const getSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
const setSettingStmt = db.prepare(
  'INSERT INTO settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
);

function getSetting(key, fallback = '') {
  const row = getSettingStmt.get(key);
  return row ? row.value : fallback;
}
function setSetting(key, value) { setSettingStmt.run(key, String(value ?? '')); }
function allSettings() {
  const out = {};
  for (const r of db.prepare('SELECT key,value FROM settings').all()) out[r.key] = r.value;
  return out;
}

/* ---------- pehli baar ka data ---------- */
const DEFAULT_SETTINGS = {
  institute_name: 'Pixel Skillz',
  city: 'Ramnagar, Nainital',
  tagline: 'Fuelling Success With Passion: Your Triumph — Our Victory',
  announcement: 'Admission Open — C++, Computer Hardware, Tally Prime 3.0, HTML, Networking, Typing | Pixel Skillz',
  phone: '+91 74658 08033',
  whatsapp: '917465808033',
  email: 'pixelskillz.computer.center@gmail.com',
  address_line1: 'Pixel Skillz Computer Center',
  address_line2: 'Near Saini Farm, Dharampur Road, Peerumadara, Ramnagar (Nainital) — 244715',
  timings: 'Somvaar – Shanivaar · 7:00 AM – 9:00 PM',
  timings_extra: 'Ravivaar: sirf doubt class',
  map_query: 'Shastri Nagar,Meerut,Uttar+Pradesh',
  facebook: '', instagram: '', youtube: '',
  stat_years: '12+', stat_students: '1400+', stat_result: '94%', stat_teachers: '8',
  trophy_text: 'Ramnagar ke students ki pehli pasand',
  banner1_count: '2025–26',
  banner1_text: '94% Students Ne Board Me 1st Division Liya',
  banner2_count: '120+',
  banner2_text: 'Computer & BCA Students Ne Course Poora Kiya',
  about_subtitle: 'Padhai, Career aur Uske Aage Ke Liye Taiyaar',
  about_para1: 'Pixel Skillz Meerut ki wo coaching hai jahan Class 1 se 12 tak har subject — Science, Commerce aur Arts — padhaya jaata hai, aur saath me BCA-level ke computer courses bhi. Naam "Pixel" isliye, kyunki hum har topic ko uske sabse chhote hisse tak kholkar samjhate hain.',
  about_para2: 'Tareeka simple hai: chhota batch, har bachche par nazar, roz homework check, aur ratta bilkul nahi.',
  cta_heading: 'Pixel Skillz me har bachche ko alag se guide kiya jaata hai — doubt solving, stream selection aur planning ke saath.',
  cta_subtext: 'Ek demo class free hai. Bachche ko ek din baithaakar dekhiye, phir faisla kijiye.',
  cta_button_text: 'Get Started Now',
};

function seedIfEmpty(table, rows, columns) {
  const n = db.prepare(`SELECT COUNT(*) c FROM ${table}`).get().c;
  if (n > 0) return;
  const cols = columns.join(',');
  const marks = columns.map(() => '?').join(',');
  const ins = db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${marks})`);
  db.exec('BEGIN');
  try {
    for (const r of rows) ins.run(...columns.map(c => r[c]));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
}

function seed() {
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    if (getSettingStmt.get(k) === undefined) setSetting(k, v);
  }

  seedIfEmpty('toppers', [
    { name:'Aditi Sharma', school:"St. Mary's Academy, Meerut", score:'96.4%', klass:'CLASS 12', theme:'p-a', groupname:'board', sort:1, active:1 },
    { name:'Rohit Kumar', school:'Dewan Public School, Meerut', score:'95.8%', klass:'CLASS 10', theme:'p-b', groupname:'board', sort:2, active:1 },
    { name:'Neha Pal', school:'Sophia Girls School, Meerut', score:'94.2%', klass:'CLASS 12', theme:'p-c', groupname:'board', sort:3, active:1 },
    { name:'Sameer Ansari', school:'K.L. International, Meerut', score:'93.6%', klass:'CLASS 10', theme:'p-d', groupname:'board', sort:4, active:1 },
    { name:'Arun Hooda', school:'BCA 2nd year, CCS University', score:'DBMS + SQL', klass:'', theme:'p-c', groupname:'computer', sort:1, active:1 },
    { name:'Pooja Verma', school:'BCA 1st year, Meerut College', score:'C & C++', klass:'', theme:'p-a', groupname:'computer', sort:2, active:1 },
    { name:'Mohd. Imran', school:'Class 12 pass, Meerut', score:'WEB DEVELOPMENT', klass:'', theme:'p-b', groupname:'computer', sort:3, active:1 },
    { name:'Kavita Singh', school:'B.Sc. CS, Meerut', score:'JAVA + DSA', klass:'', theme:'p-d', groupname:'computer', sort:4, active:1 },
  ], ['name','school','score','klass','theme','groupname','sort','active']);

  seedIfEmpty('courses', [
    { slug:'class-9-10', title:'Class 9–10 Board Foundation', badge1:'Experienced Faculty', badge2:'Poora Saal', meta1:'📘 5 subject', meta2:'👥 18 seat', theme:'p-a', sort:1, active:1 },
    { slug:'class-11-12', title:'Class 11–12 · Science / Commerce / Arts', badge1:'Teeno Stream', badge2:'Poora Saal', meta1:'📘 Stream-wise', meta2:'👥 18 seat', theme:'p-b', sort:2, active:1 },
    { slug:'c-cpp-java', title:'C · C++ · Java Programming', badge1:'Lab Included', badge2:'4 Mahine', meta1:'💻 Practical', meta2:'📘 Per language', theme:'p-c', sort:3, active:1 },
    { slug:'dbms-sql', title:'DBMS + SQL', badge1:'BCA Syllabus', badge2:'3 Mahine', meta1:'💻 Practical', meta2:'📘 Unit-wise', theme:'p-d', sort:4, active:1 },
    { slug:'web-dev', title:'Web Development — HTML, CSS, JS', badge1:'Project ke saath', badge2:'3 Mahine', meta1:'💻 Practical', meta2:'📘 1 project', theme:'p-a', sort:5, active:1 },
    { slug:'class-1-8', title:'Class 1–8 Foundation', badge1:'Neev Mazboot', badge2:'Poora Saal', meta1:'📘 4 subject', meta2:'👥 15 seat', theme:'p-b', sort:6, active:1 },
  ], ['slug','title','badge1','badge2','meta1','meta2','theme','sort','active']);

  /* teen aur course jo pehle sirf frontend ke Computer page par the,
     ab admin panel se bhi manage/photo-upload ho sakein isliye yahan jodte hain */
  {
    const MISSING_COURSES = [
      { slug: 'computer-basics', title: 'Computer Fundamentals + MS Office', badge1: 'Beginner', badge2: '3 Mahine', meta1: '💻 Practical', meta2: '📘 Lab included', theme: 'p-a' },
      { slug: 'data-structures-python', title: 'Data Structures + Python', badge1: 'Core CS', badge2: '4 Mahine', meta1: '💻 Practical', meta2: '📘 Lab included', theme: 'p-c' },
      { slug: 'bca-doubt-class', title: 'BCA Semester Doubt Class', badge1: 'Support', badge2: 'Per Semester', meta1: '💻 File help', meta2: '📘 Revision', theme: 'p-b' },
    ];
    const findByTitle = db.prepare('SELECT id FROM courses WHERE title=?');
    const insertCourse = db.prepare(`INSERT INTO courses (title,badge1,badge2,meta1,meta2,theme,slug,sort,active)
                                      VALUES (?,?,?,?,?,?,?,?,1)`);
    for (const c of MISSING_COURSES) {
      if (findByTitle.get(c.title)) continue;
      const nextSort = (db.prepare('SELECT MAX(sort) m FROM courses').get().m || 0) + 1;
      insertCourse.run(c.title, c.badge1, c.badge2, c.meta1, c.meta2, c.theme, c.slug, nextSort);
    }
  }

  seedIfEmpty('faculty', [
    { name:'R. Sharma', subject:'Physics · 11–12', detail:'M.Sc. Physics · 9 saal ka anubhav', initials:'RS', theme:'p-a', sort:1, active:1 },
    { name:'A. Verma', subject:'Maths · 6–12', detail:'B.Tech · board maths specialist', initials:'AV', theme:'p-b', sort:2, active:1 },
    { name:'S. Gupta', subject:'Biology · 9–12', detail:'M.Sc. Zoology · diagram-based teaching', initials:'SG', theme:'p-c', sort:3, active:1 },
    { name:'M. Khan', subject:'Computer · BCA', detail:'MCA · C, C++, Java aur DBMS', initials:'MK', theme:'p-d', sort:4, active:1 },
  ], ['name','subject','detail','initials','theme','sort','active']);

  seedIfEmpty('testimonials', [
    { name:'Sunil Kumar', role:'Papa · Class 10', quote:'Bete ke Science me 40 aate the. Yahan aane ke baad board me 88 aaye. Diagram wali padhai ne sach me farak dala.', stars:5, initials:'SK', theme:'p-a', sort:1, active:1 },
    { name:'Rekha Devi', role:'Mummy · Class 8', quote:'Batch chhota hai isliye teacher har bachche ko dekh paate hain. Homework na karne par ghar phone aa jaata hai — yahi to chahiye tha.', stars:5, initials:'RD', theme:'p-b', sort:2, active:1 },
    { name:'Arun Hooda', role:'Student · BCA 2nd year', quote:'BCA ka DBMS bilkul samajh nahi aa raha tha. Yahan practical karwaya, ab SQL query khud likh leta hoon.', stars:5, initials:'AH', theme:'p-c', sort:3, active:1 },
    { name:'Neha Pal', role:'Student · Class 12 Commerce', quote:'Accounts me har sawaal step-by-step karwaya jaata hai. Practice set itne mile ki board ka paper aasan lag gaya.', stars:5, initials:'NP', theme:'p-d', sort:4, active:1 },
  ], ['name','role','quote','stars','initials','theme','sort','active']);

  seedIfEmpty('fees', [
    { batch:'Class 1–5', timing:'3:00 – 4:15 PM', days:'Mon–Sat', amount:'₹700', sort:1, active:1 },
    { batch:'Class 6–8', timing:'4:30 – 6:00 PM', days:'Mon–Sat', amount:'₹1,000', sort:2, active:1 },
    { batch:'Class 9–10', timing:'6:00 – 7:30 PM', days:'Mon–Sat', amount:'₹1,400', sort:3, active:1 },
    { batch:'Class 11–12 (Science)', timing:'7:00 – 9:00 AM', days:'Mon–Sat', amount:'₹2,200', sort:4, active:1 },
    { batch:'Class 11–12 (Commerce / Arts)', timing:'7:30 – 9:00 PM', days:'Mon–Sat', amount:'₹1,800', sort:5, active:1 },
    { batch:'Computer / BCA subjects', timing:'Apni pasand ka slot', days:'Mon–Fri', amount:'₹1,200', sort:6, active:1 },
  ], ['batch','timing','days','amount','sort','active']);

  seedIfEmpty('notes', [
    { title:'Class 10 Science — sabhi chapter notes', meta:'42 pages · Hindi + English', filename:'', original:'', sort:1, active:1 },
    { title:'Class 12 Physics — formula sheet', meta:'8 pages · revision ke liye', filename:'', original:'', sort:2, active:1 },
    { title:'Class 12 Accounts — practice set', meta:'30 sawaal + solution', filename:'', original:'', sort:3, active:1 },
    { title:'Class 9–10 Maths — chapter-wise test', meta:'Har chapter ka alag paper', filename:'', original:'', sort:4, active:1 },
    { title:'C Programming — 100 solved programs', meta:'BCA 1st semester', filename:'', original:'', sort:5, active:1 },
    { title:'DBMS — SQL query practice', meta:'Joins, subquery, normalization', filename:'', original:'', sort:6, active:1 },
  ], ['title','meta','filename','original','sort','active']);

  seedIfEmpty('faqs', [
    { question:'Demo class sach me free hai?', answer:'Haan. Bachcha ek din poori class attend kar sakta hai, bina koi fees diye. Padhai pasand aaye tabhi admission lijiye.', sort:1, active:1 },
    { question:'Ek batch me kitne bachche hote hain?', answer:'Zyada se zyada 18. Class 1–5 me to 15 hi rakhte hain, taaki har bachche ki copy roz check ho sake.', sort:2, active:1 },
    { question:'Kaunsa board cover hota hai?', answer:'UP Board aur CBSE dono. NCERT ki kitaab base rehti hai, aur board ke hisaab se extra questions karwaye jaate hain.', sort:3, active:1 },
    { question:'Sirf ek subject padh sakte hain?', answer:'Ji haan. Class 9 se upar single-subject option hai — jaise sirf Maths ya sirf Accounts. Fees us hisaab se lagti hai.', sort:4, active:1 },
    { question:'Computer course ke liye apna laptop chahiye?', answer:'Nahi. Institute me lab hai aur har student ko machine milti hai. Ghar par practice ke liye apna computer ho to aur behtar.', sort:5, active:1 },
    { question:'3D wali padhai kaise hoti hai?', answer:'Class me projector par model ghumakar dikhaya jaata hai, phir bachche khud tap karke har part padhte hain. Wahi model is website par bhi khula hai — upar 3D Learning Lab me try kar lijiye.', sort:6, active:1 },
  ], ['question','answer','sort','active']);

  /* 3D topics */
  if (db.prepare('SELECT COUNT(*) c FROM topics').get().c === 0) {
    const TOPICS = require('./topics-seed');
    const insT = db.prepare('INSERT INTO topics (tkey,label,builder,dist,subject,sort,active) VALUES (?,?,?,?,?,?,1)');
    const insP = db.prepare('INSERT INTO topic_parts (topic_id,label,tag,description,facts,sort) VALUES (?,?,?,?,?,?)');
    db.exec('BEGIN');
    try {
      for (const t of TOPICS) {
        const r = insT.run(t.tkey, t.label, t.builder, t.dist, t.subject, t.sort);
        const tid = Number(r.lastInsertRowid);
        t.parts.forEach((p, i) => insP.run(tid, p[0], p[1], p[2], p[3] || '', i + 1));
      }
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }

  /* image-based 3D Lab topics — same 9 topics/parts as the old procedural
     `topics` table (topics-seed.js), pointing at the labeled PNGs already
     shipped alongside the React frontend (public/lab-images-360-labeled/),
     copied once into our own uploads/ so they're managed like any other
     admin-uploaded file. If that folder isn't present (e.g. backend deployed
     without the frontend checked out next to it), topics still seed — just
     without images, ready for the admin to upload them. */
  if (db.prepare('SELECT COUNT(*) c FROM lab_topics').get().c === 0) {
    const TOPICS = require('./topics-seed');
    const SRC_IMG_DIR = path.join(__dirname, '..', '..', 'pixelskillz-frontend', 'public', 'lab-images-360-labeled');
    const insT = db.prepare(`INSERT INTO lab_topics (tkey,label,subject,img_front,img_right,img_back,img_left,sort,active)
                              VALUES (?,?,?,?,?,?,?,?,1)`);
    const insP = db.prepare('INSERT INTO lab_topic_parts (topic_id,label,tag,description,facts,sort) VALUES (?,?,?,?,?,?)');
    db.exec('BEGIN');
    try {
      TOPICS.forEach((t, ti) => {
        const fname = {};
        for (const a of LAB_ANGLES) {
          const src = path.join(SRC_IMG_DIR, `${t.tkey}-${a}.png`);
          if (fs.existsSync(src)) {
            fname[a] = `lab-seed-${t.tkey}-${a}.png`;
            fs.copyFileSync(src, path.join(UPLOAD_DIR, fname[a]));
          } else fname[a] = '';
        }
        const r = insT.run(t.tkey, t.label, t.subject, fname.front, fname.right, fname.back, fname.left, ti + 1);
        const tid = Number(r.lastInsertRowid);
        t.parts.forEach((p, i) => insP.run(tid, p[0], p[1], p[2], p[3] || '', i + 1));
      });
      db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }

  /* pehla admin */
  const count = db.prepare('SELECT COUNT(*) c FROM admins').get().c;
  if (count === 0) {
    const username = process.env.ADMIN_USER || 'admin';
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
    const hash = bcrypt.hashSync(password, 12);
    db.prepare(`INSERT INTO admins (username,password_hash,name,must_change,created_at)
                VALUES (?,?,?,?,?)`)
      .run(username, hash, 'Admin', process.env.ADMIN_PASSWORD ? 0 : 1, Date.now());

    const note =
`=========================================================
 PIXEL SKILLZ — ADMIN KA PEHLA PASSWORD
 Username : ${username}
 Password : ${password}
 Login    : /admin
 >> Login karte hi password badal lein, phir ye file
    delete kar dein.
=========================================================
`;
    fs.writeFileSync(path.join(DATA_DIR, 'FIRST-LOGIN.txt'), note);
    console.log('\n' + note);
  }
}

module.exports = { db, getSetting, setSetting, allSettings, allImages, IMAGE_SLOTS,
                   BUILDERS, topicsForApi, labTopicsForApi, seed, DATA_DIR, UPLOAD_DIR };
