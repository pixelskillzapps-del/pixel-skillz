/* =====================================================================
   site.js — menu, slider, popup, form (har page par load hota hai)
   ===================================================================== */
/* =======================================================================
   PIXEL SKILLZ — website script
   SIRF YAHAN BADLEIN:
   ======================================================================= */
/* ===================================================================== */

function $(s){ return document.querySelector(s); }
function $$(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
function el(t,c){ var e=document.createElement(t); if(c) e.className=c; return e; }
var yrEl=document.getElementById('yr'); if(yrEl) yrEl.textContent = new Date().getFullYear();

/* ---------------- menu ---------------- */
var burger=$('#burger'), menu=$('#menu');
if(burger && menu) burger.addEventListener('click',function(){
  var o=menu.classList.toggle('open');
  burger.setAttribute('aria-expanded',o?'true':'false');
});
$$('.menu .has-drop > a').forEach(function(a){
  a.addEventListener('click',function(e){
    if(window.innerWidth<=760){ e.preventDefault(); a.parentNode.classList.toggle('open'); }
  });
});
if(menu) menu.addEventListener('click',function(e){
  if(e.target.tagName==='A' && !e.target.parentNode.classList.contains('has-drop')) menu.classList.remove('open');
});

/* ---------------- hero slider (gradient + text saath badalte hain) ---------------- */
(function(){
  var bgs=$$('.hero-bg'), txts=$$('.hslide'), dots=$('#hdots'), i=0, timer;
  if(!bgs.length) return;
  bgs.forEach(function(_,n){
    var b=document.createElement('button');
    b.setAttribute('aria-label','Slide '+(n+1));
    if(n===0) b.classList.add('on');
    b.addEventListener('click',function(){ go(n); reset(); });
    dots.appendChild(b);
  });
  function go(n){
    bgs[i].classList.remove('on'); txts[i].classList.remove('on'); dots.children[i].classList.remove('on');
    i=n;
    bgs[i].classList.add('on'); txts[i].classList.add('on'); dots.children[i].classList.add('on');
  }
  function reset(){ clearInterval(timer); timer=setInterval(function(){ go((i+1)%bgs.length); },6500); }
  reset();
})();

/* ---------------- carousels (courses + testimonials) ---------------- */
function carousel(trackSel,prevSel,nextSel){
  var t=$(trackSel), p=$(prevSel), n=$(nextSel);
  if(!t||!p||!n) return;
  function step(){ var c=t.firstElementChild; return c? c.offsetWidth+18 : 300; }
  p.addEventListener('click',function(){ t.scrollBy({left:-step(),behavior:'smooth'}); });
  n.addEventListener('click',function(){ t.scrollBy({left:step(),behavior:'smooth'}); });
}
carousel('#courseTrack','#cPrev','#cNext');
carousel('#tstTrack','#tPrev','#tNext');

/* ---------------- scroll reveal ---------------- */
(function(){
  var items=$$('.rv');
  if(!('IntersectionObserver' in window)){ items.forEach(function(x){x.classList.add('in');}); return; }
  var io=new IntersectionObserver(function(en){
    en.forEach(function(e,n){
      if(e.isIntersecting){ setTimeout(function(){ e.target.classList.add('in'); }, Math.min(n*50,200)); io.unobserve(e.target); }
    });
  },{threshold:.1,rootMargin:'0px 0px -40px 0px'});
  items.forEach(function(x){ io.observe(x); });
})();

/* ---------------- FAQ accordion ---------------- */
$$('.acc-q').forEach(function(b){
  b.addEventListener('click',function(){
    var item=b.parentNode, was=item.classList.contains('open');
    $$('.acc').forEach(function(a){ a.classList.remove('open'); });
    if(!was) item.classList.add('open');
  });
});

/* ---------------- modal ---------------- */
var modal=$('#modal');
function openModal(e){ if(!modal) return; if(e) e.preventDefault(); modal.classList.add('on'); document.body.style.overflow='hidden'; }
function closeModal(){ if(!modal) return; modal.classList.remove('on'); document.body.style.overflow=''; }
$$('[data-modal]').forEach(function(b){ b.addEventListener('click',openModal); });
if($('#modalX')) $('#modalX').addEventListener('click',closeModal);
if(modal) modal.addEventListener('click',function(e){ if(e.target===modal) closeModal(); });
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeModal(); });

/* ---------------- andar ke link khud scroll karein ----------------
   (Claude preview jaise sandbox me "Open external link" dabba na aaye) */
document.addEventListener('click',function(e){
  var a=e.target.closest ? e.target.closest('a[href^="#"]') : null;
  if(!a) return;
  var id=a.getAttribute('href');
  if(id.length>1 && !document.querySelector(id)) return;   // doosre page ka link — jaane do
  e.preventDefault();
  if(a.hasAttribute('data-modal')) return;      // popup wale button
  if(id==='#'||id==='#top'){ window.scrollTo({top:0,behavior:'smooth'}); if(menu) menu.classList.remove('open'); return; }
  var t=document.querySelector(id);
  if(t){ t.scrollIntoView({behavior:'smooth',block:'start'}); if(menu) menu.classList.remove('open'); }
},false);

/* ---------------- back to top ---------------- */
(function(){
  var top=$('#toTop');
  if(!top) return;
  window.addEventListener('scroll',function(){
    top.classList.toggle('on',(window.scrollY||window.pageYOffset)>700);
  },{passive:true});
  top.addEventListener('click',function(){ window.scrollTo({top:0,behavior:'smooth'}); });
})();

/* ---------------- forms -> server (aur phir WhatsApp) ---------------- */
var CSRF = (document.querySelector('meta[name="csrf"]')||{}).content || '';

function sendEnquiry(fields, noteEl, btn){
  if((fields.name||'').trim().length < 2){
    noteEl.textContent='Student ka naam likhna zaroori hai.'; noteEl.style.color='#C0392B'; return;
  }
  if((fields.phone||'').replace(/\D/g,'').length < 10){
    noteEl.textContent='Sahi 10-digit mobile number daalein.'; noteEl.style.color='#C0392B'; return;
  }
  noteEl.style.color=''; noteEl.textContent='Bheja jaa raha hai…';
  if(btn) btn.disabled=true;

  fetch('/enquiry',{
    method:'POST',
    headers:{'Content-Type':'application/json','X-CSRF-Token':CSRF},
    body:JSON.stringify(fields)
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(btn) btn.disabled=false;
    if(!d.ok){ noteEl.textContent=d.error||'Kuch gadbad ho gayi.'; noteEl.style.color='#C0392B'; return; }
    noteEl.style.color='#1F8A5B';
    noteEl.textContent=d.message+' Aap chahein to abhi WhatsApp par bhi bhej sakte hain.';
    if(d.whatsapp) window.open(d.whatsapp,'_blank');
  })
  .catch(function(){
    if(btn) btn.disabled=false;
    noteEl.textContent='Internet me dikkat lag rahi hai. Kripya phone karein.';
    noteEl.style.color='#C0392B';
  });
}

if($('#sendBtn')) $('#sendBtn').addEventListener('click',function(){
  sendEnquiry({
    name:$('#f-name').value, phone:$('#f-phone').value,
    course:$('#f-class').value, time_pref:$('#f-time').value,
    message:$('#f-msg').value, website:$('#f-website').value, source:'website-form'
  }, $('#formNote'), this);
});
if($('#modalSend')) $('#modalSend').addEventListener('click',function(){
  var btn=this;
  sendEnquiry({
    name:$('#m-name').value, phone:$('#m-phone').value,
    course:$('#m-class').value, website:$('#m-website').value, source:'popup'
  }, $('#modalNote'), btn);
  setTimeout(function(){ if($('#modalNote').style.color==='rgb(31, 138, 91)') closeModal(); },2500);
});
