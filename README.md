# Pixel Skillz — Website + Admin Panel

Coaching ki poori website, jiske saath ek admin panel hai. Ab content badalne ke liye
code chhune ki zaroorat nahi — sab kuch browser se badla jaa sakta hai.

---

## 1. Kya-kya milta hai

**Website (jo log dekhte hain)**
- Poora home page — hero slider, courses, result banner, faculty, fees, FAQ, testimonials
- 3D Learning Lab — dil, computer, cell, atom (touch karke khulte hain)
- Enquiry form aur "Enroll Now" popup — dono server par save hote hain
- Notes ke PDF download (ginti ke saath)

**Admin panel (`/admin`)**
- Dashboard — aaj/hafte ki enquiry ki ginti
- **Enquiries** — har enquiry, status badlein (naya / baat hui / admission / nahi), Excel download
- **Toppers, Courses, Faculty, Testimonials, Fees, Notes, FAQ** — jodein, badlein, hataayein
- **Site Settings** — naam, phone, WhatsApp, pata, timing, social links, saare numbers
- **Activity Log** — kis admin ne kab kya badla

---

## 2. Chalane ka tareeka

**Node.js chahiye — version 22.5 ya usse naya.** (nodejs.org se LTS wala)

```bash
npm install
npm start
```

> Windows par agar PowerShell me *"running scripts is disabled"* aaye, to VS Code ke
> terminal me upar-daayein dropdown se **Command Prompt** chun lein. Ho jayega.

> Is project me koi bhi library aisi nahi hai jise install karte waqt **compile**
> karna pade — isliye Python ya Visual Studio build tools ki zaroorat nahi.
> SQLite Node ke andar hi aata hai.

Browser me kholein:
- Website → `http://localhost:3000`
- Admin → `http://localhost:3000/admin`

**Pehla password:** server pehli baar chalne par khud ek random password banata hai aur
use `data/FIRST-LOGIN.txt` me likh deta hai (aur screen par bhi dikhata hai).
Login karke turant password badlein, phir wo file delete kar dein.

---

## 3. Internet par daalne ka tareeka (deploy)

Sabse aasan raaste, sasta se mehnga:

**A. Railway / Render (sabse aasan)**
1. Code GitHub par daalein
2. Railway ya Render par "New Project → Deploy from GitHub"
3. Environment variables set karein: `NODE_ENV=production`, `SESSION_SECRET=<lamba random>`
4. Apna domain (jaise pixelskillz.in) jod dein — HTTPS khud lag jaata hai

**B. Apna VPS (Hostinger / DigitalOcean, ~₹400–700 mahina)**
```bash
# server par
git clone <apna repo> && cd pixelskillz
npm ci --omit=dev
npm i -g pm2
pm2 start server.js --name pixelskillz
pm2 save && pm2 startup
```
Phir Nginx ko saamne lagayein aur Certbot se free HTTPS:
```nginx
server {
  server_name pixelskillz.in www.pixelskillz.in;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Host $host;
  }
}
```
```bash
sudo certbot --nginx -d pixelskillz.in -d www.pixelskillz.in
```

> **Zaroori:** `NODE_ENV=production` set kiye bina session cookie par `Secure` flag
> nahi lagega. Live jaane se pehle ye zaroor set karein.

---

## 3b. Photo kahan se lagayein

Admin panel → **Website ki Photos**. Wahan 10 jagah bani hui hain:

| Jagah | Kya photo achhi lagegi |
|---|---|
| Home — collage 1–4 | Classroom, students, computer lab, toppers |
| About — badi + chhoti | Building/classroom aur teacher |
| FAQ — photo 1, 2 | Doubt class, students |
| Rangeen patti — baayein, daayein | Koi bhi achhi photo |

Iske alawa **har teacher** aur **har topper** ki apni photo bhi lag sakti hai —
Faculty aur Toppers section me file chunne ka option hai. Photo na ho to
naam ke do akshar dikhte rehte hain.

- Sabse achha size: chaudai ~1200px, JPG ya PNG, 8 MB se kam
- Photo ka naam upload hote hi badal diya jaata hai (suraksha ke liye)
- Photo hatani ho to "Hataayein" — rangeen dabba wapas aa jayega

---

## 3c. 3D Learning Lab — topic jodna aur badalna

Admin panel → **3D Topics**.

Har topic ke peeche ek **saancha** (3D shakl) hota hai. Shakl code me hai, par
**naam, jaankari aur exam points database me hain** — wo aap kabhi bhi badal sakte hain.

### Do tarah ke saanche

**1. Detail wale** — inki shakl haath se banayi gayi hai, part ki ginti fix hai:

| Saancha | Parts | Kis topic ke liye |
|---|---|---|
| heart | 10 | Dil |
| computer | 8 | CPU / computer ke parts |
| cell | 7 | Cell aur organelles |
| atom | 6 | Atom, shells, electron |
| eye | 8 | Aankh |
| lungs | 6 | Phephde / saans |
| dna | 5 | DNA ka dhaancha |

Inme text badal sakte hain, par part jodne-hatane se naam aage-peeche ho jayenge.

**2. Aam saanche** — inme **jitne chahein parts jodein**, shakl apne aap ban jayegi:

| Saancha | Shakl | Kis tarah ke topic |
|---|---|---|
| `layers` | ek gole ke andar doosra gola | Prithvi ki parte, pyaaz, anda, vaayumandal |
| `orbit` | beech me ek, chaaro taraf chakkar | Solar system, chandrama, atom |
| `stack` | ek ke upar ek pattiyaan | Mitti ki parte, OSI layers, chattanon ki parte, memory hierarchy |

### Naya topic jodne ka tareeka

1. Admin → **3D Topics** → naam likhein, saancha chunein → **Jodein**
2. Agle page par ek-ek karke parts jodein — naam, jaankari, aur exam points
   (points ke beech `|` lagayein, jaise `Sabse patli parat|5–70 km`)
3. `/3d-lab` kholkar dekh lein

**Dhyan rakhein:** jis topic me ek bhi part nahi hai, wo lab me nahi dikhega.

### Koi bhi topic — apni 3D file (.glb) se

Ye sabse taakatwar tareeka hai. **Kidney, neuron, motor, engine, skeleton — kuch bhi**
jod sakte hain, bina code chhue.

**Model kahan se laayein (mufт):**
- **sketchfab.com** — sabse bada zakheera. Search karein, filter me **Downloadable**
  aur **Free** lagayein. Download karte waqt **glTF Binary (.glb)** chunein.
- **poly.pizza**, **NASA 3D Resources** (space ke liye), **BioDigital** (medical, kuch free)

**Jodne ka tareeka:**

1. Admin → **3D Topics** → naam likhein, saancha me **"Apni 3D file (.glb)"** chunein → Jodein
2. Agle page par `.glb` file upload karein (40 MB tak)
3. **"Model se parts dhoondein"** dabayein — website khud model ke andar ke hisse
   dhoondhkar part bana degi
4. Har part me apni jaankari aur exam points bhar dein
5. `/3d-lab` kholkar dekh lein — model ghumega, part tap honge, aur "Khol kar dekhein"
   par hisse alag ho jayenge

**Do galtiyan jo aksar hoti hain:**

1. **"Model se parts dhoondein" dabana bhool jaana.** Ye button dabaye bina agar aap
   khud haath se part jodenge, to poora model ek hi part ban jayega aur uske hisse
   alag nahi honge. Pehle scan, phir jaankari bharein.
2. **Model khada ya tedha dikhna.** Bahut se model Z-up bane hote hain aur seedhe
   nahi lagte. Topic ke page par **Ghumao X°** me **-90** daalkar Save karein — 90%
   maamlon me isse seedha ho jaata hai. Na ho to Y ya Z bhi try karein.

**Dhyan rakhne wali baatein:**

- Sirf **.glb** chalti hai. `.gltf`, `.fbx`, `.obj` nahi — pehle .glb me badal lein
  (Blender me: File → Export → glTF Binary)
- Model ke andar hisson ke **alag-alag naam** hone chahiye, tabhi wo alag part banenge.
  Ek hi mesh wala model poora ek hi part banega.
- File jitni chhoti, page utna tez. 5–15 MB theek rehta hai.
- Model ka size aur position apne aap theek ho jaata hai — aapko kuch nahi karna.

### Aur haath se bane saanche chahiye to?

Agar kisi topic ki achhi .glb file na mile, to uska saancha code me likha jaa sakta hai.
Topic ka naam bata dein.

---

## 4. Backup — ye sabse zyada zaroori hai

Poora data do jagah hai: `data/` folder (database) aur `public/uploads/` (PDF).
Roz raat ko copy le lein:

```bash
# crontab -e  me ye line daalein
0 2 * * * cd /path/to/pixelskillz && tar czf ~/backup-$(date +\%F).tar.gz data public/uploads && find ~ -name 'backup-*.tar.gz' -mtime +30 -delete
```

Hack se bachne se zyada zaroori hai backup hona. Sabse bura din bhi tab sirf ek
kharab din rahega, tabaahi nahi.

---

## 5. Suraksha — kya-kya lagaya hai

| Hamla | Bachav |
|---|---|
| SQL injection | Har query parameterised (`?`), string kabhi nahi jodte |
| XSS (script daalna) | EJS `<%= %>` sab escape karta hai; CSP script sirf apni site aur cdnjs se |
| CSRF (doosri site se form) | Har session ka token, har POST par jaanch |
| Password guess karna | bcrypt (12 rounds) + 5 galti par 15 min lock + IP rate limit |
| Cookie churana | HttpOnly (JS nahi padh sakta), SameSite=Strict, Secure (HTTPS par) |
| Session fixation | Login ke baad session id nayi banti hai |
| Clickjacking | `frame-ancestors 'none'` — koi iframe me nahi daal sakta |
| Nakli file upload | File ke andar ke pehle byte jaanche jaate hain, sirf PDF; naam random |
| Uploaded file chalana | `uploads` folder par `sandbox` CSP + `nosniff` |
| Path traversal (`../`) | Sirf filename DB me, folder server jodta hai |
| Spam bot | Chhupa hua honeypot field + 8 enquiry/ghanta per IP |
| Bade payload se server girana | Body limit 64 KB, file limit 8 MB |
| Server ki pehchaan | `x-powered-by` band, cookie ka naam badla |
| Andar se galti | Har admin kaam ka audit log |

### Ye sab hone par bhi — sach ye hai

Koi website 100% surakshit nahi hoti. Ye sab aam hamle rokta hai, lekin
**aapke haath me abhi bhi teen cheezein hain, aur asli khatra wahi hain:**

1. **Password** — `pixel123` rakha to upar ka koi bachav kaam nahi aayega.
   Do-teen lambe shabd jod lein, jaise `chai-meerut-purani-copy`.
2. **Update** — har 2-3 mahine me `npm audit fix` chalayein aur Node update rakhein.
   Purani library me chhed nikalte rehte hain.
3. **Backup** — upar wala cron zaroor lagayein.

Aur ek cheez jo aapke code se bahar hai: **domain aur hosting ka account.**
Dono par two-factor authentication (2FA) chalu karein. Zyadatar chhoti websites
code ke chhed se nahi, hosting ka password leak hone se jaati hain.

---

## 6. Har page ki alag file — kahan kya hai

Har page ka apna alag template hai. Kuch badalna ho to seedha us file me jao,
poori site me dhoondhne ki zaroorat nahi.

| Website ka page | URL | Kaunsi file badlein |
|---|---|---|
| Home | `/` | `views/pages/home.ejs` |
| About | `/about` | `views/pages/about.ejs` |
| Courses | `/courses` | `views/pages/courses.ejs` |
| Computer & BCA | `/computer` | `views/pages/computer.ejs` |
| 3D Learning Lab | `/3d-lab` | `views/pages/lab.ejs` |
| Results | `/results` | `views/pages/results.ejs` |
| Fees | `/fees` | `views/pages/fees.ejs` |
| Faculty | `/faculty` | `views/pages/faculty.ejs` |
| Notes | `/notes` | `views/pages/notes.ejs` |
| FAQ | `/faq` | `views/pages/faq.ejs` |
| Contact | `/contact` | `views/pages/contact.ejs` |

**Jo har page par ek jaisa hai** (ek jagah badlo, sab jagah badal jayega):

```
views/partials/head.ejs     — <head>, title, CSS ka link
views/partials/header.ejs   — upar ki patti aur menu
views/partials/footer.ejs   — neeche ka poora footer
views/partials/modal.ejs    — "Enroll Now" wala popup
views/partials/floats.ejs   — WhatsApp button, side tab, back-to-top
```

**Baaki files:**

```
server.js               — server, security, session, rate limit
src/db.js               — database ka dhaancha aur shuruaati data
src/security.js         — CSRF, validation, login lock, file jaanch
src/routes/public.js    — kaunsa URL kaunsa page kholega (PAGES ki list)
src/routes/admin.js     — admin panel
public/css/site.css     — website ka design
public/css/admin.css    — admin panel ka design
public/js/site.js       — menu, slider, popup, form (har page par)
public/js/lab.js        — sirf 3D Learning Lab ka code (sirf /3d-lab par)
data/                   — database (git me kabhi mat daalein)
public/uploads/         — upload ki hui PDF
```

### Naya page kaise jodein

Maan lo `/gallery` page chahiye:

1. `views/pages/gallery.ejs` banao. Sabse upar aur neeche ye daalo:
   ```
   <%- include('../partials/head') %>
   <%- include('../partials/header') %>
   <main id="top">
     ... yahan apna content ...
   </main>
   <%- include('../partials/footer') %>
   <%- include('../partials/modal') %>
   <%- include('../partials/floats') %>
   <script src="/js/site.js"></script>
   </body></html>
   ```
2. `src/routes/public.js` me `PAGES` list me ek line jodo:
   ```js
   { url: '/gallery', view: 'gallery', title: 'Gallery' },
   ```
3. `views/partials/header.ejs` me menu me link jodo.

Bas — server restart karo, page chal jayega.

## 7. Aage kya jod sakte hain

- Student login — apna result aur attendance dekhne ke liye
- Online fees (Razorpay)
- Online test / mock test
- Enquiry aane par turant WhatsApp ya SMS alert
- Photo gallery upload (abhi sirf PDF chalta hai)
