/* =====================================================================
   topics-seed.js — 3D Learning Lab ke shuruaati topic aur unke parts
   (Ye sirf pehli baar bharta hai. Uske baad admin se badlein.)
   ===================================================================== */
module.exports = [
  {
    tkey: 'heart', label: 'Dil / Heart', builder: 'heart', dist: 9.5, subject: 'Biology', sort: 1,
    parts: [
      ['Left Ventricle', 'Biology', 'Dil ka sabse taakatwar hissa. Iski deewar sabse moti hoti hai kyunki ise saaf khoon poore sharer me — pair ki ungli tak — pump karna padta hai. Isi se aorta nikalti hai.', 'Sabse moti wall|Saaf khoon → poora sharer|Aorta yahin se'],
      ['Right Ventricle', 'Biology', 'Sharer se aaya ashuddh (bina oxygen wala) khoon yahan se pulmonary artery ke through phephdon me bheja jaata hai. Iski deewar left ventricle se patli hoti hai.', 'Ashuddh khoon → lungs|Patli wall'],
      ['Septum (beech ki deewar)', 'Biology', 'Ye moti maansal deewar dil ko daayein aur baayein hisse me baantti hai. Isi ki wajah se saaf aur ashuddh khoon aapas me nahi milte.', 'Saaf–ashuddh alag rakhta hai|Inter-ventricular septum'],
      ['Left Atrium', 'Biology', 'Phephdon se oxygen wala saaf khoon pulmonary vein ke through yahan aata hai, phir bicuspid valve se hokar left ventricle me jaata hai.', 'Lungs se saaf khoon|Pulmonary vein isme khulti hai'],
      ['Right Atrium', 'Biology', 'Poore sharer se ghoomkar aaya ashuddh khoon vena cava ke zariye yahan pahunchta hai. Dil ki dhadkan yahin se shuru hoti hai — SA node (pacemaker) isi me hota hai.', 'Sharer se ashuddh khoon|SA node = pacemaker'],
      ['Aorta', 'Biology', 'Sharer ki sabse badi dhamni. Left ventricle se nikalkar mudti hai aur saaf khoon poore body me baantti hai. Deewar mazboot aur lachili hoti hai taaki high pressure jhel sake.', 'Sabse badi artery|Left ventricle se nikalti hai'],
      ['Pulmonary Artery', 'Biology', 'Ekmatra artery jo ashuddh khoon le jaati hai. Right ventricle se nikalkar do shakhaon me batkar dono phephdon me jaati hai.', 'Ashuddh khoon le jaati hai|Right ventricle → lungs'],
      ['Vena Cava', 'Biology', 'Do badi nasein — superior (upar se) aur inferior (neeche se) — poore sharer ka ashuddh khoon wapas laakar right atrium me daalti hain.', 'Superior + Inferior|Sharer → right atrium'],
      ['Coronary Artery', 'Biology', 'Dil khud ko khoon inhi patli naliyon se deta hai, jo uski upri satah par failti hain. Inme rukawat (block) aa jaaye to heart attack hota hai.', 'Dil ko khud ka khoon|Block = heart attack'],
      ['Valves (Kapaat)', 'Biology', 'Ek-tarfa darwaze. Khoon ko sirf ek disha me jaane dete hain, peeche palatne nahi dete. Baayein taraf bicuspid (mitral) aur daayein taraf tricuspid valve hoti hai — inke band hone ki hi "lub-dub" awaaz aati hai.', 'Bicuspid = left|Tricuspid = right|"Lub-dub" ki awaaz'],
    ],
  },
  {
    tkey: 'computer', label: 'Computer / CPU', builder: 'computer', dist: 10, subject: 'Computer', sort: 2,
    parts: [
      ['Cabinet (CPU box)', 'Hardware', 'Ye dhaatu/plastic ka dabba saare parts ko dhool, dhakke aur bijli ke jhatke se bachata hai. Aage power button aur USB port hote hain, aur vents se hawa aati-jaati hai.', 'Case / Chassis|Front panel: power + USB'],
      ['Motherboard', 'Hardware', 'Computer ki reedh ki haddi. Is bade hare board par CPU, RAM aur graphics card lagte hain, aur ismein bane patle taambe ke taar (traces) sabko aapas me jodte hain.', 'Mainboard bhi kehte hain|Sab kuch isi par lagta hai'],
      ['CPU (Processor)', 'Hardware', 'Computer ka dimaag. Har hisaab aur har instruction yahi chalata hai. Bahut garam hota hai isliye upar heatsink (dhaatu ki pattiyaan) aur fan lagta hai. Speed GHz me naapi jaati hai.', 'Central Processing Unit|ALU + Control Unit + Register|Speed = GHz'],
      ['RAM', 'Hardware', 'Temporary memory. Jo file ya program abhi khula hai wo RAM me rehta hai taaki CPU turant utha sake. Computer band karte hi RAM khaali ho jaati hai — isliye ise volatile memory kehte hain.', 'Random Access Memory|Volatile — bijli gayi, data gaya|Zyada RAM = zyada speed'],
      ['Graphics Card (GPU)', 'Hardware', 'Screen par jo bhi picture, video ya game dikhta hai uska hisaab ye lagata hai. Gaming, video editing aur 3D kaam me iski sabse zyada zaroorat padti hai.', 'Graphics Processing Unit|PCIe slot me lagta hai'],
      ['SMPS (Power Supply)', 'Hardware', 'Deewar se aane wali 220V AC bijli ko computer ke laayak chhoti DC bijli (12V, 5V, 3.3V) me badalta hai aur taaron ke zariye har part tak pahunchata hai.', 'Switch Mode Power Supply|AC → DC'],
      ['Hard Disk / SSD', 'Hardware', 'Permanent storage. Photo, video, software aur Windows sab yahi rehte hain — computer band hone par bhi data safe rehta hai. SSD, purani hard disk se kai guna tez hoti hai.', 'Non-volatile memory|GB / TB me naapa jaata hai'],
      ['Cooling Fan', 'Hardware', 'Andar ki garam hawa bahar phenkta hai aur thandi hawa andar khinchta hai. Fan ruk jaaye to CPU garam hokar computer apne aap band ho sakta hai.', 'Garmi bahar nikalta hai|Speed RPM me'],
    ],
  },
  {
    tkey: 'cell', label: 'Cell aur Organelles', builder: 'cell', dist: 8.6, subject: 'Biology', sort: 3,
    parts: [
      ['Cell Membrane', 'Biology', 'Cell ke chaaro taraf ki patli jeevit jhilli. Ye tay karti hai kaunsa padarth andar aayega aur kaunsa bahar jaayega — isliye ise selectively permeable kehte hain.', 'Selectively permeable|Sabhi cells me hoti hai'],
      ['Nucleus', 'Biology', 'Cell ka control room. Ismein DNA rehta hai jo tay karta hai ki cell kya kaam karega. Beech me nucleolus hota hai jo ribosome banata hai.', 'DNA yahin rehta hai|Cell ka "dimaag"|Andar nucleolus'],
      ['Mitochondria', 'Biology', 'Cell ka power house. Khaane se mili energy ko ATP me badalta hai jise cell istemaal kar sake. Iske andar mudi hui pattiyaan (cristae) hoti hain aur iska apna DNA bhi hota hai.', 'ATP banata hai|Power house of the cell|Cristae + apna DNA'],
      ['Endoplasmic Reticulum', 'Biology', 'Nucleus se judi naliyon ka jaal. Rough ER par ribosome chipke hote hain aur wo protein banata hai; smooth ER fat (lipid) banata hai aur zeher saaf karta hai.', 'Rough ER → protein|Smooth ER → lipid'],
      ['Golgi Apparatus', 'Biology', 'Cell ka packaging aur courier department. ER se aaya protein yahan sudhara, pack aur label hokar sahi jagah bheja jaata hai.', 'Packaging + dispatch|ER se maal aata hai'],
      ['Ribosomes', 'Biology', 'Sabse chhote daane-jaise kan. Yahi protein banate hain isliye inhe "protein factory" kehte hain. Kuch ER par chipke hote hain aur kuch cytoplasm me khule ghoomte hain.', 'Protein factory|Sabse chhota organelle'],
      ['Vacuole', 'Biology', 'Paani, khaana aur waste jama karne wali theli. Plant cell me ye bahut badi hoti hai aur cell ko akda (turgid) rakhti hai.', 'Plant cell me badi|Paani + waste storage'],
    ],
  },
  {
    tkey: 'atom', label: 'Atom aur Shells', builder: 'atom', dist: 9.6, subject: 'Chemistry', sort: 4,
    parts: [
      ['Proton', 'Chemistry', 'Nucleus me maujood positive (+) charge wala kan. Kisi bhi element ka atomic number = uske protons ki ginti. Proton badla to element hi badal jaata hai.', 'Charge: +1|Atomic number = proton ki ginti'],
      ['Neutron', 'Chemistry', 'Nucleus me hi rehta hai par ispar koi charge nahi hota. Ye nucleus ko sthir (stable) rakhta hai. Proton + neutron milkar mass number banate hain.', 'Charge: 0|Mass number = p + n'],
      ['K Shell', 'Chemistry', 'Nucleus ke sabse paas wali pehli shell. Isme zyada se zyada 2 electron hi aa sakte hain aur inki energy sabse kam hoti hai.', 'Max 2 electron|n = 1'],
      ['L Shell', 'Chemistry', 'Doosri shell. Isme 8 tak electron aa sakte hain (2n² = 8). K bhar jaane ke baad electron yahin bharte hain.', 'Max 8 electron|2n² niyam'],
      ['M Shell', 'Chemistry', 'Teesri shell, 18 tak electron rakh sakti hai. Sabse bahari shell ke electron ko valence electron kehte hain — chemical reaction inhi se hoti hai.', 'Max 18 electron|Bahari = valence'],
      ['Electron', 'Chemistry', 'Negative (–) charge wala bahut halka kan jo nucleus ke chaaro taraf shells me ghoomta hai. Electron dena, lena ya share karna hi chemical bonding kehlata hai.', 'Charge: –1|Shells me ghoomta hai|Bonding inhi se'],
    ],
  },
  {
    tkey: 'eye', label: 'Aankh / Human Eye', builder: 'eye', dist: 9.2, subject: 'Biology', sort: 5,
    parts: [
      ['Cornea', 'Biology', 'Aankh ke sabse aage ka paardarshi (transparent) ubhra hua hissa. Bahar se aane wali roshni sabse pehle yahin mudti hai — aankh ka zyadatar focus isi se hota hai.', 'Paardarshi|Sabse zyada refraction yahin'],
      ['Iris', 'Biology', 'Rangeen gol parda — isi se aankh kaali, bhoori ya neeli dikhti hai. Ye phailkar aur sikudkar pupil ka size badalta hai, jisse andar jaane wali roshni ki maatra control hoti hai.', 'Aankh ka rang|Roshni control karti hai'],
      ['Pupil', 'Biology', 'Iris ke beech ka kaala chhed. Andhere me bada ho jaata hai taaki zyada roshni aaye, aur tez roshni me chhota ho jaata hai.', 'Kaala chhed|Andhere me bada'],
      ['Lens', 'Biology', 'Paardarshi, lachila aur dono taraf se ubhra hua (biconvex). Ciliary muscle isko mota-patla karke door aur paas ki cheez par focus karta hai — isi ko accommodation kehte hain.', 'Biconvex|Accommodation|Ciliary muscle'],
      ['Retina', 'Biology', 'Aankh ke peeche ka parda jahan ulta aur chhota image banta hai. Ismein rod cells (kam roshni) aur cone cells (rang) hote hain.', 'Ulta image banta hai|Rod + Cone cells'],
      ['Optic Nerve', 'Biology', 'Retina par bana image yahi nas dimaag tak le jaati hai, jahan dimaag use seedha karke dikhata hai. Jahan ye nas judti hai wahan koi cell nahi hota — usi ko blind spot kehte hain.', 'Retina → dimaag|Blind spot yahin'],
      ['Sclera', 'Biology', 'Aankh ka safed, mazboot bahari khol. Ye aankh ki shakl banaye rakhta hai aur andar ke naazuk hisso ki raksha karta hai.', 'Safed hissa|Suraksha kavach'],
      ['Vitreous Humour', 'Biology', 'Lens aur retina ke beech bhara hua gaadha paardarshi drav. Ye aankh ko gol phoola hua rakhta hai aur roshni ko retina tak jaane deta hai.', 'Gaadha drav|Aankh ko shakl deta hai'],
    ],
  },
  {
    tkey: 'lungs', label: 'Phephde / Lungs', builder: 'lungs', dist: 9.5, subject: 'Biology', sort: 6,
    parts: [
      ['Trachea (Saans nali)', 'Biology', 'Gale se neeche jaane wali mukhya hawa ki nali. Iske chaaro taraf C-shape ke cartilage ke chhalle hote hain jo ise pichakne nahi dete.', 'Windpipe|Cartilage ke chhalle'],
      ['Bronchi', 'Biology', 'Trachea neeche jaakar do shakhaon me batt jaati hai — ek daayein phephde me, ek baayein me. Inhi ko bronchus kehte hain.', 'Do shakhayein|Har lung me ek'],
      ['Bronchioles', 'Biology', 'Bronchi aage chalkar patli se patli naliyon me batt jaate hain, bilkul ped ki tehniyon jaise. Inke sire par alveoli lagi hoti hain.', 'Ped ki tehni jaisi|Alveoli tak le jaati hain'],
      ['Alveoli', 'Biology', 'Angoor ke guchhe jaise chhote thaile, jinki deewar ek hi cell moti hoti hai. Yahin par hawa se oxygen khoon me jaati hai aur carbon dioxide bahar aati hai — asli saans yahin hoti hai.', 'Gas exchange yahin|Deewar ek cell moti|Crore ki ginti me'],
      ['Left aur Right Lung', 'Biology', 'Daayein phephde me 3 lobe hote hain aur baayein me sirf 2, kyunki baayein taraf dil ke liye jagah chhodni padti hai.', 'Right = 3 lobe|Left = 2 lobe'],
      ['Diaphragm', 'Biology', 'Phephdon ke neeche gumbad jaisi maansal jhilli. Ye neeche jaakar chhati ka size badhata hai jisse hawa andar khinchti hai — saans lena isi se hota hai.', 'Saans lene ki mukhya maanspeshi|Neeche = hawa andar'],
    ],
  },
  {
    tkey: 'dna', label: 'DNA ka dhaancha', builder: 'dna', dist: 10, subject: 'Biology', sort: 7,
    parts: [
      ['Double Helix', 'Biology', 'DNA do ladiyon se bana hota hai jo ek doosre ke chaaro taraf marodi hui seedhi ki tarah lipti rehti hain. Ye shakl Watson aur Crick ne 1953 me batayi thi.', 'Marodi hui seedhi|Watson & Crick, 1953'],
      ['Sugar-Phosphate Backbone', 'Biology', 'Seedhi ke dono khambe. Ye deoxyribose sugar aur phosphate ke baari-baari jude hue anu se bante hain, aur DNA ko mazbooti dete hain.', 'Deoxyribose + Phosphate|Bahar ki taraf'],
      ['Nitrogen Bases', 'Biology', 'Chaar akshar — A (Adenine), T (Thymine), G (Guanine), C (Cytosine). Inhi ka kram tay karta hai ki sharer me kaunsa protein banega.', 'A, T, G, C|Inka kram = jaankari'],
      ['Base Pairing', 'Biology', 'A hamesha T se judta hai aur G hamesha C se. Isi niyam ki wajah se ek ladi dekhkar doosri ka anumaan lagaya jaa sakta hai, aur DNA apni nakal bana pata hai.', 'A–T aur G–C|Complementary'],
      ['Hydrogen Bond', 'Biology', 'Dono ladiyon ko jodne wale kamzor bandhan. A–T ke beech 2 aur G–C ke beech 3 hote hain. Kamzor hone ki wajah se hi DNA aasani se khulkar nakal bana leta hai.', 'A–T me 2 bond|G–C me 3 bond'],
    ],
  },
  {
    tkey: 'earth', label: 'Prithvi ki parte', builder: 'layers', dist: 9.5, subject: 'Geography', sort: 8,
    parts: [
      ['Crust (Bhoopatal)', 'Geography', 'Sabse upri patli parat jispar hum rehte hain. Samundar ke neeche ye sirf 5–10 km moti hoti hai aur pahadon ke neeche 70 km tak.', 'Sabse patli parat|5–70 km'],
      ['Mantle (Mantal)', 'Geography', 'Crust ke neeche ki sabse moti parat, lagbhag 2,900 km. Yahan chattanein garmi se adh-pighli haalat me hoti hain aur dheere-dheere behti hain — isi se plate khiskti hain.', 'Sabse moti parat|Adh-pighli chattan'],
      ['Outer Core (Bahari core)', 'Geography', 'Pighle hue lohe aur nickel ka drav. Iske ghoomne se hi prithvi ka chumbakiya kshetra (magnetic field) banta hai, jiski wajah se compass kaam karta hai.', 'Drav avastha|Magnetic field yahin banta hai'],
      ['Inner Core (Andar ka core)', 'Geography', 'Prithvi ka kendra — loha aur nickel, taapmaan lagbhag 5,500°C. Itni garmi ke baad bhi ye thos hai, kyunki upar se dabav bahut zyada hai.', 'Thos loha|~5,500°C'],
    ],
  },
  {
    tkey: 'solar', label: 'Solar System', builder: 'orbit', dist: 11, subject: 'Science', sort: 9,
    parts: [
      ['Sooraj (Sun)', 'Science', 'Solar system ka kendra — ek taara. Iska gurutvakarshan hi saare grahon ko apni kaksha me baandhe rakhta hai. Solar system ka 99% se zyada dravyaman isi me hai.', 'Ek taara hai|99% dravyaman'],
      ['Budh (Mercury)', 'Science', 'Sooraj ke sabse paas aur sabse chhota grah. Iska koi vaayumandal nahi, isliye din me bahut garam aur raat me bahut thanda ho jaata hai.', 'Sabse paas|Sabse chhota grah'],
      ['Shukra (Venus)', 'Science', 'Sabse garam grah, kyunki iska mota vaayumandal garmi ko baahar nahi jaane deta. Ise "prithvi ki behen" bhi kehte hain kyunki size lagbhag ek jaisa hai.', 'Sabse garam grah|Prithvi jaisa size'],
      ['Prithvi (Earth)', 'Science', 'Ekmatra gyaat grah jahan jeevan hai. Sahi doori, paani aur vaayumandal — teeno ki wajah se yahan jeevan sambhav hua.', 'Jeevan wala grah|Ek chandrama'],
      ['Mangal (Mars)', 'Science', 'Laal grah, kyunki iski mitti me loha (iron oxide) hai. Yahan solar system ka sabse ooncha parvat Olympus Mons hai.', 'Laal grah|Olympus Mons'],
      ['Brihaspati (Jupiter)', 'Science', 'Sabse bada grah — gas ka gola. Ispar ek badi laal aandhi (Great Red Spot) sadiyon se chal rahi hai.', 'Sabse bada grah|Great Red Spot'],
      ['Shani (Saturn)', 'Science', 'Apne chamakdaar chhallon ke liye mashhoor. Ye chhalle barf aur chattan ke crore tukdon se bane hain. Itna halka hai ki paani me tair sakta hai.', 'Chhallon wala grah|Paani se halka'],
      ['Arun (Uranus)', 'Science', 'Ye grah lagbhag let kar ghoomta hai — iska axis 98° jhuka hua hai. Methane gas ki wajah se hara-neela dikhta hai.', 'Letkar ghoomta hai|Hara-neela rang'],
      ['Varun (Neptune)', 'Science', 'Sooraj se sabse door grah. Yahan solar system ki sabse tez hawaayein chalti hain — 2,000 km/ghanta tak.', 'Sabse door grah|Sabse tez hawa'],
    ],
  },
];
