/* =====================================================================
   lab.js — 3D Learning Lab (sirf /3d-lab page par load hota hai)
   ===================================================================== */
function $(s){ return document.querySelector(s); }
function el(t,c){ var e=document.createElement(t); if(c) e.className=c; return e; }

/* =======================================================================
   3D EXPLORER
   ---------------------------------------------------------------------
   ASLI .glb MODEL DAALNA HO TO:
   1) three.js ke saath GLTFLoader bhi <script> se load karein
   2) TOPICS me `file:'models/heart.glb'` add karein
   3) loadGLB() function (neeche) usko root me daal dega
   ======================================================================= */
(function(){
  var host=document.querySelector('#canvas-host');
  if(!host) return;                 // is page par 3D lab nahi hai
  if(!window.THREE){ $('#loading').textContent='3D library load nahi hui — internet check karein.'; return; }

  var scene,camera,renderer,root,raycaster,pointer,ground;
  var parts=[],labels=[],selected=-1;
  var rotX=-0.12,rotY=0.55,dist=9,targetDist=9;
  var spin=true,exploded=false,explodeT=0,explodeTarget=0;
  var clock=0,currentKey=null,electronOrbits=[],orbiters=[];
  var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var V=new THREE.Vector3();

  /* ---------------- geometry helpers ---------------- */
  function M(color,o){
    o=o||{};
    return new THREE.MeshStandardMaterial({
      color:color,
      roughness:o.rough===undefined?0.5:o.rough,
      metalness:o.metal===undefined?0.1:o.metal,
      transparent:o.opacity!==undefined,
      opacity:o.opacity===undefined?1:o.opacity,
      side:o.side||THREE.FrontSide,
      flatShading:!!o.flat
    });
  }
  function fin(m,o){
    o=o||{};
    m.castShadow=!o.noShadow; m.receiveShadow=!o.noShadow;
    return m;
  }
  function box(w,h,d,c,x,y,z,o){
    var m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),M(c,o));
    m.position.set(x||0,y||0,z||0); return fin(m,o);
  }
  function ball(r,c,x,y,z,o){
    var m=new THREE.Mesh(new THREE.SphereGeometry(r,32,24),M(c,o));
    m.position.set(x||0,y||0,z||0); return fin(m,o);
  }
  function cyl(rt,rb,h,c,x,y,z,o){
    var m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,26),M(c,o));
    m.position.set(x||0,y||0,z||0); return fin(m,o);
  }
  function ring(r,tube,c,arc,o){
    return fin(new THREE.Mesh(new THREE.TorusGeometry(r,tube,16,64,arc||Math.PI*2),M(c,o)),o);
  }
  /* lathe = ghumakar banaya gaya shape (dil, mitochondria) */
  function lathe(pts,c,phiStart,phiLen,o){
    var v=[];
    for(var i=0;i<pts.length;i++) v.push(new THREE.Vector2(pts[i][0],pts[i][1]));
    var g=new THREE.LatheGeometry(v,54,phiStart||0,phiLen===undefined?Math.PI*2:phiLen);
    g.computeVertexNormals();
    return fin(new THREE.Mesh(g,M(c,o)),o);
  }
  /* tube = curve ke saath-saath nali (aorta, ER, cable) */
  function tube(pts,rad,c,o){
    var v=[];
    for(var i=0;i<pts.length;i++) v.push(new THREE.Vector3(pts[i][0],pts[i][1],pts[i][2]));
    var curve=new THREE.CatmullRomCurve3(v);
    var g=new THREE.TubeGeometry(curve,64,rad,14,false);
    return fin(new THREE.Mesh(g,M(c,o)),o);
  }
  /* blob = halka tedha-medha gola (organic feel) */
  function blob(r,c,amt,seed,o){
    var g=new THREE.SphereGeometry(r,44,32);
    var p=g.attributes.position;
    for(var i=0;i<p.count;i++){
      var x=p.getX(i),y=p.getY(i),z=p.getZ(i);
      var n=Math.sin(x*2.6+seed)*Math.cos(y*2.1-seed)*Math.sin(z*2.9+seed*1.7)
           +0.5*Math.sin(x*4.7-seed*2)*Math.cos(z*4.1+seed);
      var k=1+amt*n;
      p.setXYZ(i,x*k,y*k,z*k);
    }
    g.computeVertexNormals();
    var m=new THREE.Mesh(g,M(c,o));
    return fin(m,o);
  }

  /* ---------------- part registration ----------------
     Geometry (shakl) yahan code me hai. Naam, jaankari aur points
     database se aate hain — admin panel se badle jaa sakte hain.
     ------------------------------------------------------------- */
  var TEXT = [];          // is topic ke parts ka text, database se
  function P(dir, objs){
    var idx = parts.length;
    var t = TEXT[idx] || {};
    var g = new THREE.Group();
    for(var i=0;i<objs.length;i++) g.add(objs[i]);
    root.add(g);
    var meshes=[]; g.traverse(function(o){ if(o.isMesh) meshes.push(o); });
    var c=new THREE.Vector3(); new THREE.Box3().setFromObject(g).getCenter(c);
    meshes.forEach(function(m){ m.userData.partIndex=idx; m.userData.base=m.material.color.getHex(); });
    parts.push({
      name: t.label || ('Part ' + (idx+1)),
      tag:  t.tag || '',
      desc: t.desc || '',
      facts: t.facts || [],
      dir: dir ? new THREE.Vector3(dir[0],dir[1],dir[2]) : null,
      obj:g, meshes:meshes, center:c
    });
  }

  /* =====================================================================
     1. DIL / HEART
     ===================================================================== */
  function buildHeart(){
    var profile=[[0.03,-1.85],[0.30,-1.72],[0.54,-1.44],[0.74,-1.05],[0.90,-0.55],
                 [1.00,0.00],[1.04,0.45],[0.99,0.85],[0.87,1.16],[0.66,1.38],[0.40,1.49],[0.13,1.52]];

    var lv=lathe(profile,0xA8342A,0,Math.PI,{side:THREE.DoubleSide,rough:.62,metal:.02});
    lv.scale.set(1.06,1,1.02);
    var lvIn=lathe(profile,0x7C231B,0,Math.PI,{side:THREE.DoubleSide,rough:.7});
    lvIn.scale.set(0.62,0.78,0.6); lvIn.position.y=-0.15;
    P([2.6,-0.8,0.4],[lv,lvIn]);

    var rv=lathe(profile,0x4A7FA8,Math.PI,Math.PI,{side:THREE.DoubleSide,rough:.62,metal:.02});
    rv.scale.set(0.94,0.95,0.97);
    P([-2.6,-0.8,0.4],[rv]);

    var sep=box(0.07,2.5,1.5,0x8E2F26,0,-0.28,0,{rough:.7});
    P([0,-1.0,3.0],[sep]);

    var la=blob(0.6,0xC4483C,0.06,3.1,{rough:.6}); la.position.set(0.58,1.78,-0.05); la.scale.set(1,0.82,1);
    P([2.2,2.4,-0.3],[la]);

    var ra=blob(0.6,0x5A93BC,0.06,7.4,{rough:.6}); ra.position.set(-0.62,1.72,0.05); ra.scale.set(1,0.82,1);
    P([-2.2,2.4,-0.3],[ra]);

    var ao=tube([[0.38,1.30,0],[0.44,2.05,0],[0.20,2.72,-0.02],[-0.48,2.92,-0.08],[-0.88,2.40,-0.16],[-0.94,1.72,-0.22]],
                0.21,0xD9584A,{rough:.45});
    var ao2=tube([[-0.94,1.72,-0.22],[-1.0,1.1,-0.3]],0.17,0xD9584A,{rough:.45});
    P([1.4,3.4,-0.6],[ao,ao2]);

    var pa=tube([[-0.18,1.36,0.38],[-0.06,2.02,0.42],[-0.5,2.48,0.36],[-1.2,2.58,0.16]],0.185,0x4E9AC9,{rough:.45});
    var pa2=tube([[-0.5,2.48,0.36],[-0.35,2.8,0.7],[0.15,2.9,0.9]],0.13,0x4E9AC9,{rough:.45});
    P([-1.6,3.4,1.2],[pa,pa2]);

    var svc=tube([[-0.9,3.15,-0.5],[-0.92,2.4,-0.46],[-0.82,1.82,-0.34]],0.17,0x7FB0CE,{rough:.5});
    var ivc=tube([[-0.5,1.5,-0.6],[-0.62,0.85,-0.8],[-0.72,0.2,-0.92]],0.155,0x7FB0CE,{rough:.5});
    P([-3.4,2.2,-1.6],[svc,ivc]);

    var cor=tube([[0.10,1.18,0.80],[0.48,0.62,0.92],[0.56,0.00,0.90],[0.40,-0.72,0.74],[0.16,-1.22,0.52]],0.055,0xB92E24,{rough:.4});
    var cor2=tube([[0.48,0.62,0.92],[0.85,0.35,0.55],[1.0,-0.2,0.2]],0.042,0xB92E24,{rough:.4});
    var cor3=tube([[-0.15,1.15,0.72],[-0.55,0.6,0.78],[-0.75,0.0,0.62]],0.045,0xB92E24,{rough:.4});
    P([0.8,-0.4,3.2],[cor,cor2,cor3]);

    var v1=ring(0.33,0.065,0xF0E6D8); v1.position.set(0.52,1.18,-0.02); v1.rotation.x=Math.PI/2;
    var v2=ring(0.31,0.06,0xF0E6D8); v2.position.set(-0.56,1.14,0.02); v2.rotation.x=Math.PI/2;
    P([0,3.2,1.8],[v1,v2]);
  }

  /* =====================================================================
     2. COMPUTER
     ===================================================================== */
  function buildComputer(){
    var shell=box(3.5,4.5,2.0,0x9BAAB6,0,0,0,{opacity:0.14,side:THREE.DoubleSide,rough:.25,metal:.6,noShadow:true});
    var front=box(3.5,4.5,0.08,0x3A4750,0,0,1.02,{opacity:0.5,rough:.4,metal:.4,noShadow:true});
    var pw=cyl(0.09,0.09,0.06,0x4E9AC9,1.1,1.85,1.08,{noShadow:true}); pw.rotation.x=Math.PI/2;
    var usb1=box(0.28,0.11,0.05,0x222A30,1.1,1.5,1.07,{noShadow:true});
    var usb2=box(0.28,0.11,0.05,0x222A30,1.1,1.28,1.07,{noShadow:true});
    P([0,0,-3.4],[shell,front,pw,usb1,usb2]);

    var mb=box(3.0,4.0,0.09,0x14663F,0,0,-0.72,{rough:.85,metal:.05});
    var traces=[];
    for(var t=0;t<5;t++) traces.push(box(2.4,0.02,0.015,0x2FA36F,0,1.5-t*0.75,-0.66,{noShadow:true}));
    for(var t2=0;t2<4;t2++) traces.push(box(0.02,3.0,0.015,0x2FA36F,-1.1+t2*0.72,0,-0.66,{noShadow:true}));
    var chipset=box(0.55,0.55,0.12,0x6E7B85,-0.05,-1.35,-0.62,{metal:.7});
    var caps=[];
    for(var cN=0;cN<6;cN++){
      var cp=cyl(0.09,0.09,0.22,0x2C3238,-1.15+cN*0.16,0.35,-0.55);
      cp.rotation.x=Math.PI/2; caps.push(cp);
    }
    P([-3.6,0,0],[mb].concat(traces,[chipset],caps));

    var chip=box(0.66,0.66,0.1,0xD8A93A,-0.55,1.15,-0.62,{metal:.75,rough:.28});
    var hsBase=box(1.0,1.0,0.12,0xB4BFC7,-0.55,1.15,-0.5,{metal:.85,rough:.3});
    var fins=[];
    for(var f=0;f<11;f++) fins.push(box(0.055,0.95,0.42,0xC3CDD4,-0.98+f*0.088,1.15,-0.23,{metal:.85,rough:.3}));
    var cfanHub=cyl(0.12,0.12,0.1,0x2C3238,-0.55,1.15,0.05); cfanHub.rotation.x=Math.PI/2;
    P([-1.2,3.0,1.4],[chip,hsBase].concat(fins,[cfanHub]));

    var rams=[];
    for(var r=0;r<3;r++){
      rams.push(box(0.15,1.6,0.1,0x2E8B7A,0.55+r*0.26,0.95,-0.6,{metal:.35}));
      rams.push(box(0.15,0.08,0.11,0xD8A93A,0.55+r*0.26,0.16,-0.6,{metal:.8,rough:.25}));
    }
    P([2.8,2.4,0.6],rams);

    var gpcb=box(2.4,0.5,0.16,0x1B2429,0.2,-0.5,-0.6,{metal:.5});
    var gshroud=box(2.3,0.72,0.5,0x39424A,0.2,-0.5,-0.28,{metal:.55,rough:.4});
    var gf1=cyl(0.26,0.26,0.09,0x4E9AC9,-0.3,-0.5,-0.02); gf1.rotation.x=Math.PI/2;
    var gf2=cyl(0.26,0.26,0.09,0x4E9AC9,0.66,-0.5,-0.02); gf2.rotation.x=Math.PI/2;
    P([0,-1.6,3.2],[gpcb,gshroud,gf1,gf2]);

    var psu=box(1.6,1.1,1.3,0x4A555E,-0.85,-1.62,0,{metal:.6,rough:.45});
    var pgrill=cyl(0.4,0.4,0.06,0x252D33,-0.85,-1.05,0);
    var cab1=tube([[-0.5,-1.1,0.2],[-0.2,-0.7,-0.2],[-0.1,-0.2,-0.5]],0.07,0x1A1F24,{rough:.7});
    var cab2=tube([[-0.7,-1.1,0.35],[-0.9,-0.4,0.1],[-1.2,0.6,-0.45]],0.065,0xC0392B,{rough:.7});
    P([-3.0,-2.8,0],[psu,pgrill,cab1,cab2]);

    var ssd=box(1.15,0.32,0.9,0x8E99A2,0.98,-1.6,0.25,{metal:.85,rough:.3});
    var lbl=box(0.7,0.02,0.5,0x2C3238,0.98,-1.43,0.25,{noShadow:true});
    P([3.2,-2.2,0.8],[ssd,lbl]);

    var fanRing=ring(0.52,0.06,0x39424A); fanRing.position.set(0,1.85,0.75);
    var fanHub=cyl(0.14,0.14,0.12,0x252D33,0,1.85,0.75); fanHub.rotation.x=Math.PI/2;
    var blades=[];
    for(var b=0;b<7;b++){
      var bl=box(0.42,0.15,0.04,0xD3DBE0,0,1.85,0.75,{rough:.4});
      bl.geometry.translate(0.26,0,0);
      bl.rotation.z=(b/7)*Math.PI*2;
      bl.rotation.y=0.3;
      blades.push(bl);
    }
    P([0,3.4,1.8],[fanRing,fanHub].concat(blades));
  }

  /* =====================================================================
     3. CELL
     ===================================================================== */
  function buildCell(){
    var mem=blob(2.05,0x5FBFA5,0.035,1.7,{opacity:0.14,side:THREE.DoubleSide,rough:.2,noShadow:true});
    var mem2=blob(1.98,0x8FD8C6,0.035,1.7,{opacity:0.10,side:THREE.DoubleSide,noShadow:true});
    P([0,3.6,0],[mem,mem2]);

    var nuc=blob(0.76,0x7A5AB8,0.05,4.2,{opacity:0.9,rough:.45}); nuc.position.set(0.3,0.35,0);
    var nlus=ball(0.29,0x4A2E80,0.3,0.35,0,{rough:.5});
    P([1.6,2.0,0.4],[nuc,nlus]);

    var mito=[];
    var mp=[[-1.2,-0.55,0.35,0.6],[-0.55,-1.25,-0.45,-0.4],[-1.35,0.6,-0.5,1.2]];
    for(var i=0;i<mp.length;i++){
      var outer=blob(0.34,0xE07A5F,0.04,i*3.3,{rough:.5});
      outer.scale.set(2.0,0.82,0.82); outer.rotation.z=mp[i][3];
      outer.position.set(mp[i][0],mp[i][1],mp[i][2]);
      var cr=tube([[-0.5,0.08,0],[-0.25,-0.1,0],[0,0.1,0],[0.25,-0.1,0],[0.5,0.08,0]],0.05,0xB84A32,{rough:.6});
      cr.position.set(mp[i][0],mp[i][1],mp[i][2]); cr.rotation.z=mp[i][3];
      mito.push(outer,cr);
    }
    P([-2.8,-1.6,0.8],mito);

    var er=[];
    er.push(tube([[1.15,0.9,0.3],[0.55,1.15,-0.5],[-0.2,0.85,-0.9],[-0.5,0.15,-0.6],[-0.1,-0.35,0.1],[0.7,-0.2,0.6],[1.2,0.35,0.5]],0.075,0x4E9AC9,{rough:.5}));
    er.push(tube([[1.0,1.2,-0.2],[0.3,1.45,-0.8],[-0.45,1.05,-1.0]],0.06,0x4E9AC9,{rough:.5}));
    P([2.8,-1.4,-1.0],er);

    var gol=[];
    for(var g=0;g<4;g++){
      var sac=ring(0.42-g*0.055,0.07,0xF0A030,Math.PI*0.95);
      sac.position.set(-0.2,1.0+g*0.16,-0.9);
      sac.rotation.set(Math.PI/2,0,0.15);
      sac.scale.set(1,1,0.45);
      gol.push(sac);
    }
    P([-1.6,2.8,-1.8],gol);

    var ribs=[],seed=7;
    for(var k=0;k<20;k++){
      seed=(seed*9301+49297)%233280; var a=(seed/233280)*Math.PI*2;
      seed=(seed*9301+49297)%233280; var b=(seed/233280)*Math.PI-Math.PI/2;
      var rr=1.3+(k%3)*0.18;
      ribs.push(ball(0.085,0xE8EDF2,rr*Math.cos(b)*Math.cos(a),rr*Math.sin(b),rr*Math.cos(b)*Math.sin(a),{rough:.4,noShadow:true}));
    }
    P([1.2,-3.0,1.8],ribs);

    var vac=blob(0.6,0x86CFE8,0.05,9.1,{opacity:0.55,rough:.25}); vac.position.set(-1.0,0.75,0.7);
    P([-2.4,1.6,2.4],[vac]);
  }

  /* =====================================================================
     4. ATOM
     ===================================================================== */
  function buildAtom(){
    var protons=[],neutrons=[];
    var pos=[[0,0,0],[0.25,0.17,0.11],[-0.23,0.19,-0.13],[0.05,-0.27,0.19],
             [-0.19,-0.21,0.21],[0.27,-0.11,-0.21],[-0.05,0.31,0.23],[0.13,0.05,-0.31]];
    for(var i=0;i<pos.length;i++){
      var m=ball(0.18,i%2?0x94A6B5:0xE05A47,pos[i][0],pos[i][1],pos[i][2],{rough:.35,metal:.15});
      (i%2?neutrons:protons).push(m);
    }
    P([-3.4,1.8,0],protons);
    P([-3.4,-1.8,0],neutrons);

    var shells=[
      {r:1.3,n:2,name:'K Shell',col:0x1B5E9C,tilt:[0.3,0.2,0],dir:[2.8,2.4,0],
       desc:'Nucleus ke sabse paas wali pehli shell. Isme zyada se zyada 2 electron hi aa sakte hain aur inki energy sabse kam hoti hai.',facts:['Max 2 electron','n = 1']},
      {r:2.05,n:6,name:'L Shell',col:0x1F8A5B,tilt:[1.2,0.5,0.4],dir:[3.3,0,0],
       desc:'Doosri shell. Isme 8 tak electron aa sakte hain (2n² = 8). K bhar jaane ke baad electron yahin bharte hain.',facts:['Max 8 electron','2n² niyam']},
      {r:2.8,n:4,name:'M Shell',col:0xF07C1F,tilt:[0.6,1.3,0.8],dir:[2.8,-2.4,0],
       desc:'Teesri shell, 18 tak electron rakh sakti hai. Sabse bahari shell ke electron ko valence electron kehte hain — chemical reaction inhi se hoti hai.',facts:['Max 18 electron','Bahari = valence']}
    ];
    for(var s=0;s<shells.length;s++){
      var sd=shells[s];
      var rg=ring(sd.r,0.022,sd.col,undefined,{noShadow:true});
      rg.rotation.set(sd.tilt[0],sd.tilt[1],sd.tilt[2]);
      P(sd.dir,[rg]);
    }

    var electrons=[];
    for(var s2=0;s2<shells.length;s2++){
      for(var e=0;e<shells[s2].n;e++){
        var em=ball(0.135,0xF5A623,0,0,0,{rough:.3,noShadow:true});
        em.material.emissive=new THREE.Color(0x7a4c00);
        electrons.push(em);
        electronOrbits.push({mesh:em,r:shells[s2].r,speed:0.55-s2*0.13,
          phase:(e/shells[s2].n)*Math.PI*2,tilt:shells[s2].tilt});
      }
    }
    P(null,electrons);
  }


  /* =====================================================================
     5. AANKH / EYE
     ===================================================================== */
  function buildEye(){
    var cornea=lathe([[0.02,1.72],[0.32,1.62],[0.58,1.38],[0.74,1.05]],0xCFE9F5,0,Math.PI*2,
                     {opacity:0.42,side:THREE.DoubleSide,rough:.08,metal:.1,noShadow:true});
    P([0,0,3.4],[cornea]);

    var iris=ring(0.46,0.13,0x5A87B8,undefined,{rough:.55}); iris.position.set(0,0,1.16); iris.rotation.x=Math.PI/2;
    iris.rotation.x=0; iris.scale.set(1,1,0.4);
    var irisDisc=cyl(0.6,0.6,0.05,0x6E9BC9,0,0,1.14,{rough:.6}); irisDisc.rotation.x=Math.PI/2;
    P([2.6,1.6,1.2],[irisDisc,iris]);

    var pupil=cyl(0.26,0.26,0.07,0x0E1520,0,0,1.2,{rough:.9}); pupil.rotation.x=Math.PI/2;
    P([2.6,-1.6,1.4],[pupil]);

    var lens=lathe([[0.0,0.30],[0.30,0.24],[0.50,0.10],[0.56,0.0],[0.50,-0.10],[0.30,-0.24],[0.0,-0.30]],
                   0xDCEEF7,0,Math.PI*2,{opacity:0.55,side:THREE.DoubleSide,rough:.06,noShadow:true});
    lens.position.set(0,0,0.82); lens.rotation.x=Math.PI/2;
    P([-2.8,1.6,1.0],[lens]);

    var retina=lathe([[1.42,-0.35],[1.35,-0.85],[1.10,-1.3],[0.70,-1.62],[0.15,-1.75]],
                     0xC46B5E,0,Math.PI*2,{side:THREE.DoubleSide,rough:.7});
    retina.rotation.x=-Math.PI/2;
    P([0,-2.8,-1.6],[retina]);

    var nerve=tube([[0,-0.15,-1.62],[0.15,-0.3,-2.3],[0.5,-0.5,-3.0]],0.24,0xE8D6A8,{rough:.6});
    P([1.2,-1.6,-3.2],[nerve]);

    var sclera=lathe([[0.16,1.68],[0.72,1.42],[1.24,0.90],[1.5,0.15],[1.46,-0.6],[1.16,-1.24],[0.62,-1.66],[0.12,-1.76]],
                     0xF2F0EC,0,Math.PI*2,{side:THREE.DoubleSide,rough:.55,opacity:0.30});
    sclera.rotation.x=-Math.PI/2;
    P([0,3.0,-0.6],[sclera]);

    var vit=ball(1.12,0xE6F3FA,0,0,-0.15,{opacity:0.22,rough:.05,noShadow:true});
    P([-3.0,-1.8,-0.6],[vit]);
  }

  /* =====================================================================
     6. PHEPHDE / LUNGS
     ===================================================================== */
  function buildLungs(){
    var trachea=tube([[0,2.9,0],[0,2.2,0],[0,1.55,0]],0.26,0xD9A6A0,{rough:.6});
    var rings=[];
    for(var i=0;i<6;i++){ var rg=ring(0.29,0.045,0xC98C86,undefined,{noShadow:true});
      rg.position.set(0,2.85-i*0.24,0); rg.rotation.x=Math.PI/2; rings.push(rg); }
    P([0,3.2,0],[trachea].concat(rings));

    var b1=tube([[0,1.55,0],[0.45,1.15,0.1],[0.95,0.85,0.15]],0.19,0xCE968F,{rough:.6});
    var b2=tube([[0,1.55,0],[-0.45,1.15,0.1],[-0.95,0.85,0.15]],0.19,0xCE968F,{rough:.6});
    P([0,2.4,2.2],[b1,b2]);

    var br=[];
    [[1,1],[-1,1]].forEach(function(s){
      for(var k=0;k<4;k++){
        var x=0.95*s[0], y=0.85, sp=(k-1.5)*0.32;
        br.push(tube([[x,y,0.15],[x+sp*0.6*s[0],y-0.55,0.2],[x+sp*s[0]*1.3,y-1.15,0.25]],0.075,0xC08880,{rough:.6}));
      }
    });
    P([0,-0.6,3.0],br);

    var alv=[]; var seed=13;
    for(var a=0;a<26;a++){
      seed=(seed*9301+49297)%233280; var u=seed/233280;
      seed=(seed*9301+49297)%233280; var v=seed/233280;
      var side=a%2?1:-1;
      alv.push(ball(0.115,0xF0B9B2, side*(0.9+u*0.9), -0.9-v*1.0, 0.15+u*0.5,{rough:.5,noShadow:true}));
    }
    P([3.2,-1.4,1.6],alv);

    var prof=[[0.05,1.05],[0.62,0.75],[0.92,0.15],[1.02,-0.55],[0.88,-1.2],[0.55,-1.65],[0.12,-1.85]];
    var lungR=lathe(prof,0xE0A9A2,0,Math.PI*2,{side:THREE.DoubleSide,rough:.65,opacity:0.55});
    lungR.position.set(1.35,-0.35,0.05); lungR.scale.set(1.05,1,0.8);
    var lungL=lathe(prof,0xD9A099,0,Math.PI*2,{side:THREE.DoubleSide,rough:.65,opacity:0.55});
    lungL.position.set(-1.35,-0.35,0.05); lungL.scale.set(0.88,1,0.78);
    P([0,0,-3.2],[lungR,lungL]);

    var dia=lathe([[0,0.42],[0.8,0.34],[1.6,0.14],[2.2,-0.12],[2.5,-0.3]],0xB9736B,0,Math.PI*2,
                  {side:THREE.DoubleSide,rough:.7});
    dia.position.set(0,-2.35,0); dia.scale.set(1,0.8,0.75);
    P([0,-3.2,0],[dia]);
  }

  /* =====================================================================
     7. DNA
     ===================================================================== */
  function buildDna(){
    var TURNS=2.2, H=5.4, N=90;
    function strand(off,color){
      var pts=[];
      for(var i=0;i<=N;i++){
        var t=i/N, a=t*Math.PI*2*TURNS+off;
        pts.push([Math.cos(a)*0.95, -H/2+t*H, Math.sin(a)*0.95]);
      }
      return tube(pts,0.13,color,{rough:.45});
    }
    // 1. poora dhaancha (dono ladi + rungs ek saath, halka)
    var ghost1=strand(0,0x8FA8D8), ghost2=strand(Math.PI,0x8FA8D8);
    ghost1.material.opacity=0.25; ghost1.material.transparent=true;
    ghost2.material.opacity=0.25; ghost2.material.transparent=true;
    P([0,0,-3.4],[ghost1,ghost2]);

    // 2. backbone
    P([-3.2,0,0],[strand(0,0x3E5BC8),strand(Math.PI,0x7B3FA0)]);

    // 3. bases
    var bases=[], bonds=[], pairs=[];
    for(var i=0;i<14;i++){
      var t=i/13, a=t*Math.PI*2*TURNS, y=-H/2+t*H;
      var x1=Math.cos(a)*0.95, z1=Math.sin(a)*0.95;
      var x2=Math.cos(a+Math.PI)*0.95, z2=Math.sin(a+Math.PI)*0.95;
      var at=i%2===0;
      var c1=at?0xE2574C:0x16A34A, c2=at?0xF5A623:0x2E7BE0;
      bases.push(cyl(0.11,0.11,0.62,c1,(x1+x1*0.35)/1.35*0.62,y,(z1+z1*0.35)/1.35*0.62,{rough:.5}));
      bases.push(cyl(0.11,0.11,0.62,c2,(x2+x2*0.35)/1.35*0.62,y,(z2+z2*0.35)/1.35*0.62,{rough:.5}));
      var b1=bases[bases.length-2], b2=bases[bases.length-1];
      b1.rotation.z=Math.PI/2; b1.rotation.y=-a;
      b2.rotation.z=Math.PI/2; b2.rotation.y=-a;
      pairs.push(cyl(0.05,0.05,0.42,0xF2EFE4,0,y,0,{noShadow:true}));
      var pr=pairs[pairs.length-1]; pr.rotation.z=Math.PI/2; pr.rotation.y=-a;
      bonds.push(pr);
    }
    P([3.2,0.8,0],bases);
    P([0,3.2,0],bonds.slice(0,7));
    P([0,-3.2,0],bonds.slice(7));
  }

  /* =====================================================================
     AAM SAANCHE — inse aap khud naye topic bana sakte hain
     ===================================================================== */
  var PALETTE=[0x2540B5,0xF26B21,0x16A34A,0x7B3FA0,0xE2402A,0x0E7C6B,0x2E7BE0,0xB45309,0x8B5CF6];

  /* parat-dar gola: prithvi ki parte, pyaaz, anda… */
  function buildLayers(n){
    for(var i=0;i<n;i++){
      var r=2.3-(i*(1.9/Math.max(n,1)));
      var last=(i===n-1);
      var m=blob(r,PALETTE[i%PALETTE.length],0.02,i*3.7,
                 last?{rough:.5}:{opacity:0.42,side:THREE.DoubleSide,rough:.4,noShadow:true});
      P([0,(n-i)*0.9,0],[m]);
    }
  }

  /* chakkar lagane wala: solar system, atom, chandrama… */
  function buildOrbit(n){
    P(null,[ball(0.85,0xF5A623,0,0,0,{rough:.35,noShadow:true})]);   // kendra
    orbiters=[];
    for(var i=1;i<n;i++){
      var r=1.5+i*0.62, size=0.16+((i%3)*0.07);
      var rg=ring(r,0.012,0x9AA9C4,undefined,{noShadow:true});
      rg.rotation.x=Math.PI/2;
      var b=ball(size,PALETTE[i%PALETTE.length],r,0,0,{rough:.5,noShadow:true});
      P([0,0,0],[rg,b]);
      orbiters.push({mesh:b,r:r,speed:0.5/Math.sqrt(i),phase:i*1.3});
    }
  }

  /* tah-dar: OSI layers, mitti ki parte, memory hierarchy… */
  function buildStack(n){
    for(var i=0;i<n;i++){
      var w=3.2-i*0.16, y=(n/2-i)*0.62;
      P([0,0,0],[box(w,0.5,2.0,PALETTE[i%PALETTE.length],0,y,0,{rough:.5})]);
      parts[parts.length-1].dir=new THREE.Vector3(0,(n/2-i)*1.1,2.2);
    }
  }

  /* =====================================================================
     APNI .glb FILE — Sketchfab wagairah se download ki hui
     Model ke andar jo mesh hote hain, unhe part banakar jod dete hain.
     ===================================================================== */
  function buildGlb(topic, done){
    if(!THREE.GLTFLoader){ $('#loading').textContent='3D model loader nahi mila.'; return; }
    $('#loading').style.display='grid';
    $('#loading').textContent='3D model load ho raha hai… (badi file me thoda time lagta hai)';

    new THREE.GLTFLoader().load(topic.model, function(gltf){
      var scn = gltf.scene;

      // agar model tedha ya khada aa raha ho to admin se ghumaya jaa sakta hai
      var rot = topic.rot || [0,0,0];
      if(rot[0]||rot[1]||rot[2]){
        var wrap = new THREE.Group();
        wrap.add(scn);
        wrap.rotation.set(rot[0]*Math.PI/180, rot[1]*Math.PI/180, rot[2]*Math.PI/180);
        wrap.updateMatrixWorld(true);
        scn = wrap;
      }

      // model ko beech me laao aur theek size me karo
      var bb = new THREE.Box3().setFromObject(scn);
      var size = bb.getSize(new THREE.Vector3());
      var mid  = bb.getCenter(new THREE.Vector3());
      var big  = Math.max(size.x, size.y, size.z) || 1;
      var k    = 5.0 / big;
      scn.scale.setScalar(k);
      scn.position.sub(mid.multiplyScalar(k));
      scn.updateMatrixWorld(true);

      // camera ki doori model ke size ke hisaab se apne aap
      var sph = new THREE.Box3().setFromObject(scn).getBoundingSphere(new THREE.Sphere());
      targetDist = Math.max(5.5, Math.min(18,
        sph.radius / Math.tan((camera.fov * Math.PI / 180) / 2) * 1.25));

      // ZAROORI: har mesh ka asli (world) transform yaad rakho
      var byName = {};
      scn.traverse(function(o){
        if(!o.isMesh) return;
        o.updateMatrixWorld(true);
        var wm = o.matrixWorld.clone();
        o.castShadow = o.receiveShadow = true;

        // material theek karo
        if(Array.isArray(o.material)) o.material = o.material[0];
        o.material = o.material.clone();

        // agar material me koi rang nahi to achha default rang do
        var mat = o.material;
        var hasColor = mat.color && (mat.color.r > 0.02 || mat.color.g > 0.02 || mat.color.b > 0.02);
        var hasMap   = !!mat.map;
        if(!hasColor && !hasMap){
          // har part ko alag rang — PALETTE se
          var PALETTE3D = [0x2540B5,0xF26B21,0x16A34A,0x7B3FA0,0xE2402A,
                           0x0E7C6B,0x2E7BE0,0xB45309,0x8B5CF6,0x0891B2];
          mat.color.setHex(PALETTE3D[parts.length % PALETTE3D.length]);
          mat.roughness = 0.55; mat.metalness = 0.15;
        }

        o.matrixAutoUpdate = true;
        wm.decompose(o.position, o.quaternion, o.scale);

        // Mesh ka naam ya parent node ka naam dono try karo
        var nm = o.name || (o.parent && o.parent.name) || 'part';
        // Agar mesh ka naam generic hai to parent try karo
        if(!o.name && o.parent && o.parent.name) nm = o.parent.name;
        (byName[nm] = byName[nm] || []).push(o);
      });

      /* Explode ki disha.
         Sirf "beech se bahar" karne par bahut saare parts ek hi taraf jaate hain
         aur ek doosre par chadh jaate hain. Isliye usme ek phaila hua
         (fibonacci sphere) disha bhi mila dete hain — parts alag-alag bikhar jaate hain
         par apni taraf hi rehte hain. */
      var GOLD = Math.PI * (3 - Math.sqrt(5));
      function addPart(list, i, n){
        P(null, list);
        var p = parts[parts.length - 1];

        var radial = p.center.lengthSq() > 0.02
          ? p.center.clone().normalize() : new THREE.Vector3(0, 1, 0);

        var y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
        var r = Math.sqrt(Math.max(0, 1 - y * y));
        var th = GOLD * i;
        var spread = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);

        var dir = radial.multiplyScalar(0.55).add(spread.multiplyScalar(0.65));
        if (dir.lengthSq() < 0.01) dir.set(0, 1, 0);
        p.dir = dir.normalize().multiplyScalar(2.6 + (i / Math.max(n, 1)) * 2.4);
      }

      var used = {}, matched = [];
      (topic.parts || []).forEach(function(p){
        var list = p.mesh && byName[p.mesh] ? byName[p.mesh] : null;
        if(!list) return;
        used[p.mesh] = true;
        matched.push(list);
      });
      var leftover = [];
      Object.keys(byName).forEach(function(nm){ if(!used[nm]) leftover = leftover.concat(byName[nm]); });
      var total = matched.length + (leftover.length ? 1 : 0);
      matched.forEach(function(list, i){ addPart(list, i, total); });

      if(leftover.length){
        TEXT[parts.length] = { label: parts.length ? 'Baaki hissa' : (topic.label || 'Model'), tag:'', desc:'', facts:[] };
        addPart(leftover, total - 1, total);
      }

      $('#loading').style.display='none';
      if(done) done();
    }, undefined, function(){
      $('#loading').textContent='Model file khul nahi payi. Dobara upload karke dekhein.';
    });
  }

  /* ---------------- topics — database se aate hain ---------------- */
  var GEO = {
    heart: buildHeart, computer: buildComputer, cell: buildCell, atom: buildAtom,
    eye: buildEye, lungs: buildLungs, dna: buildDna,
    layers: buildLayers, orbit: buildOrbit, stack: buildStack
  };
  var TOPICS = {};        // key -> {label, builder, dist, parts:[…]}

  /* ---------------- setup ---------------- */
  function init(){
    scene=new THREE.Scene();
    camera=new THREE.PerspectiveCamera(40,1,0.1,200);
    try{ renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); }
    catch(err){ $('#loading').textContent='Aapka browser 3D (WebGL) support nahi karta.'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.shadowMap.enabled=true;
    renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xFFFFFF,0xC8D6E2,0.75));
    var key=new THREE.DirectionalLight(0xFFF6E8,1.0);
    key.position.set(5,8,7); key.castShadow=true;
    key.shadow.mapSize.width=1024; key.shadow.mapSize.height=1024;
    key.shadow.camera.left=-8; key.shadow.camera.right=8;
    key.shadow.camera.top=8; key.shadow.camera.bottom=-8;
    key.shadow.camera.near=1; key.shadow.camera.far=30;
    key.shadow.radius=3; scene.add(key);
    var fill=new THREE.DirectionalLight(0xBFD9F0,0.45); fill.position.set(-7,-1,4); scene.add(fill);
    var rim=new THREE.DirectionalLight(0xFFFFFF,0.35); rim.position.set(0,2,-9); scene.add(rim);

    ground=new THREE.Mesh(new THREE.PlaneGeometry(50,50),new THREE.ShadowMaterial({opacity:0.12}));
    ground.rotation.x=-Math.PI/2; ground.position.y=-4.2; ground.receiveShadow=true;
    scene.add(ground);

    root=new THREE.Group(); scene.add(root);
    raycaster=new THREE.Raycaster(); pointer=new THREE.Vector2();

    bindPointer();
    window.addEventListener('resize',resize); resize();
    tick();

    fetch('/api/topics')
      .then(function(r){ return r.json(); })
      .then(function(list){
        if(!list || !list.length){ $('#loading').textContent='Abhi koi topic nahi jodra gaya.'; return; }
        list.forEach(function(t){ TOPICS[t.key]=t; });
        buildTabs();
        load(list[0].key);
        $('#loading').style.display='none';
      })
      .catch(function(){ $('#loading').textContent='Topic load nahi ho paye. Page refresh karein.'; });
  }

  function resize(){
    var w=host.clientWidth,h=host.clientHeight;
    if(!w||!h) return;
    camera.aspect=w/h; camera.updateProjectionMatrix();
    renderer.setSize(w,h,false);
  }

  function buildTabs(){
    var bar=$('#topicTabs');
    Object.keys(TOPICS).forEach(function(k){
      var b=el('button','chip');
      b.textContent=TOPICS[k].label;
      b.setAttribute('role','tab'); b.setAttribute('aria-selected','false');
      b.dataset.key=k;
      b.addEventListener('click',function(){ load(k); });
      bar.appendChild(b);
    });
  }

  function clearScene(){
    for(var i=root.children.length-1;i>=0;i--){
      var g=root.children[i];
      g.traverse(function(o){ if(o.isMesh){ o.geometry.dispose(); o.material.dispose(); } });
      root.remove(g);
    }
    parts=[]; electronOrbits=[]; orbiters=[];
    labels.forEach(function(l){ l.remove(); }); labels=[];
    $('#partBtns').innerHTML='';
  }

  function load(key){
    if(key===currentKey) return;
    currentKey=key;
    clearScene();
    root.rotation.set(0,0,0);
    selected=-1; exploded=false; explodeTarget=0; explodeT=0;
    $('#btnExplode').classList.remove('active');
    $('#btnExplode').textContent='Khol kar dekhein';
    var topic=TOPICS[key];
    TEXT = topic.parts || [];
    targetDist = topic.dist || 9.5;

    if(topic.builder === 'glb' && topic.model){
      buildGlb(topic, finishLoad);
      return;                              // baaki kaam model aane ke baad
    }
    var fn = GEO[topic.builder] || GEO.layers;
    fn(TEXT.length);                       // aam saanchon ko part ki ginti chahiye
    rotX=-0.12; rotY=0.55;

    document.querySelectorAll('#topicTabs .chip').forEach(function(c){
      c.setAttribute('aria-selected',c.dataset.key===key?'true':'false');
    });

    finishLoad();
  }

  function finishLoad(){
    var pb=$('#partBtns'); pb.innerHTML='';
    labels.forEach(function(l){ l.remove(); }); labels=[];
    parts.forEach(function(p,i){
      var d=el('div','label'); d.textContent=p.name; host.appendChild(d); labels.push(d);
      var b=el('button','pbtn'); b.textContent=p.name;
      b.addEventListener('click',function(){ select(i,true); });
      pb.appendChild(b);
    });
    setInfo(null);
  }

  function setInfo(p){
    if(!p){
      $('#infoTag').textContent='Shuruaat';
      $('#infoTitle').textContent='Kisi bhi part par tap karein';
      $('#infoDesc').textContent='Model ka koi bhi hissa tap karein — ya neeche di gayi list se part chunein. "Khol kar dekhein" dabaane par poora model alag-alag hokar khul jaayega.';
      $('#infoFacts').innerHTML='';
      return;
    }
    $('#infoTag').textContent=p.tag;
    $('#infoTitle').textContent=p.name;
    $('#infoDesc').textContent=p.desc;
    var f=$('#infoFacts'); f.innerHTML='';
    p.facts.forEach(function(t){ var s=el('span','fact'); s.textContent=t; f.appendChild(s); });
  }

  function select(idx,keep){
    if(!keep && selected===idx) idx=-1;
    parts.forEach(function(p,i){
      p.meshes.forEach(function(m){
        m.material.color.setHex(i===idx?0xF07C1F:m.userData.base);
      });
    });
    selected=idx;
    setInfo(idx>=0?parts[idx]:null);
    var btns=$('#partBtns').children;
    for(var i=0;i<btns.length;i++) btns[i].classList.toggle('on',i===idx);
    if(idx>=0 && spin){ spin=false; syncSpin(); }
  }
  function syncSpin(){ $('#btnSpin').classList.toggle('active',spin); }

  /* ---------------- controls ---------------- */
  function bindPointer(){
    var drag=false,moved=0,lx=0,ly=0,pd0=0,pStart=0;
    function down(x,y){ drag=true; moved=0; lx=x; ly=y; host.classList.add('dragging'); }
    function move(x,y){
      if(!drag) return;
      var dx=x-lx,dy=y-ly; lx=x; ly=y; moved+=Math.abs(dx)+Math.abs(dy);
      rotY+=dx*0.008; rotX+=dy*0.006;
      rotX=Math.max(-1.15,Math.min(1.15,rotX));
    }
    function up(){ drag=false; host.classList.remove('dragging'); return moved; }

    host.addEventListener('mousedown',function(e){ down(e.clientX,e.clientY); });
    window.addEventListener('mousemove',function(e){ move(e.clientX,e.clientY); });
    window.addEventListener('mouseup',function(e){
      var m=up();
      if(m<6 && host.contains(e.target)) pick(e.clientX,e.clientY);
    });
    host.addEventListener('touchstart',function(e){
      if(e.touches.length===1) down(e.touches[0].clientX,e.touches[0].clientY);
      else if(e.touches.length===2){
        pd0=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
        pStart=targetDist;
      }
    },{passive:true});
    host.addEventListener('touchmove',function(e){
      if(e.touches.length===1) move(e.touches[0].clientX,e.touches[0].clientY);
      else if(e.touches.length===2 && pd0){
        var d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
        targetDist=Math.max(4.5,Math.min(22,pStart*(pd0/d)));
      }
      if(e.cancelable) e.preventDefault();
    },{passive:false});
    host.addEventListener('touchend',function(e){
      var m=up(); pd0=0;
      if(m<8 && e.changedTouches.length) pick(e.changedTouches[0].clientX,e.changedTouches[0].clientY);
    });
    host.addEventListener('wheel',function(e){
      targetDist=Math.max(4.5,Math.min(22,targetDist+(e.deltaY>0?0.7:-0.7)));
      e.preventDefault();
    },{passive:false});
  }

  function pick(cx,cy){
    var r=host.getBoundingClientRect();
    pointer.x=((cx-r.left)/r.width)*2-1;
    pointer.y=-((cy-r.top)/r.height)*2+1;
    raycaster.setFromCamera(pointer,camera);
    var hits=raycaster.intersectObjects(root.children,true);
    for(var i=0;i<hits.length;i++){
      var o=hits[i].object;
      while(o && o.userData.partIndex===undefined) o=o.parent;
      if(o && o.userData.partIndex!==undefined){ select(o.userData.partIndex); return; }
    }
    select(-1);
  }

  $('#btnExplode').addEventListener('click',function(){
    exploded=!exploded; explodeTarget=exploded?1:0;
    this.classList.toggle('active',exploded);
    this.textContent=exploded?'Wapas jodein':'Khol kar dekhein';
  });
  $('#btnSpin').addEventListener('click',function(){ spin=!spin; syncSpin(); });
  $('#btnReset').addEventListener('click',function(){
    rotX=-0.12; rotY=0.55; targetDist=TOPICS[currentKey].dist;
    exploded=false; explodeTarget=0;
    $('#btnExplode').classList.remove('active');
    $('#btnExplode').textContent='Khol kar dekhein';
    select(-1,false);
  });

  function updateLabels(){
    var showAll=exploded && host.clientWidth>560;
    var w=host.clientWidth,h=host.clientHeight;
    for(var i=0;i<parts.length;i++){
      var lab=labels[i];
      if(!(i===selected||showAll)){ lab.classList.remove('on','sel'); continue; }
      V.copy(parts[i].center); parts[i].obj.localToWorld(V); V.project(camera);
      if(V.z>1){ lab.classList.remove('on','sel'); continue; }
      lab.style.left=((V.x*0.5+0.5)*w)+'px';
      lab.style.top=((-V.y*0.5+0.5)*h)+'px';
      lab.classList.add('on');
      lab.classList.toggle('sel',i===selected);
    }
  }

  var tmpE=new THREE.Euler();
  function tick(){
    requestAnimationFrame(tick);
    clock+=0.016;
    if(spin && !reduce) rotY+=0.0032;
    explodeT+=(explodeTarget-explodeT)*0.085;
    dist+=((targetDist*(1+0.45*explodeT))-dist)*0.085;
    root.rotation.x=rotX; root.rotation.y=rotY;

    for(var i=0;i<parts.length;i++){
      if(parts[i].dir) parts[i].obj.position.copy(parts[i].dir).multiplyScalar(explodeT);
    }
    for(var o2=0;o2<orbiters.length;o2++){
      var ob=orbiters[o2], ang=ob.phase+clock*ob.speed;
      ob.mesh.position.set(Math.cos(ang)*ob.r,0,Math.sin(ang)*ob.r);
    }
    for(var e=0;e<electronOrbits.length;e++){
      var o=electronOrbits[e], a=o.phase+clock*o.speed;
      V.set(Math.cos(a)*o.r,Math.sin(a)*o.r,0);
      tmpE.set(o.tilt[0],o.tilt[1],o.tilt[2]);
      V.applyEuler(tmpE);
      o.mesh.position.copy(V);
    }
    camera.position.set(0,0.9,dist);
    camera.lookAt(0,0,0);
    renderer.render(scene,camera);
    updateLabels();
  }

  init();
})();
