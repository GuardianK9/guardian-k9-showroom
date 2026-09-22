import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

window.__GK_SHOWROOM_READY__=true;

const productData={
  hoodie:{name:'FIELD HOODIE',price:148,priceLabel:'$148',image:'https://cdn.3dassets.dev/assets/27162/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/35452/v1/model.glb',meta:'Heavyweight / Black / Drop 01',desc:'Heavyweight pullover hoodie with a field-first silhouette, restrained branding and a substantial hand feel.'},
  zip:{name:'OPERATOR ZIP',price:168,priceLabel:'$168',image:'https://cdn.3dassets.dev/assets/27161/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/27161/v1/model.glb',meta:'Full zip / Black / Drop 01',desc:'Full-zip technical layer with a hooded outerwear profile and a clean, monochrome finish.'},
  tee:{name:'STREET TEE',price:62,priceLabel:'$62',image:'https://cdn.3dassets.dev/assets/35447/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/35447/v1/model.glb',meta:'Heavy cotton / Black / Drop 01',desc:'Heavy cotton tee cut for an easy straight fit. Minimal exterior treatment keeps the silhouette doing the work.'},
  long:{name:'NIGHT LONG SLEEVE',price:0,priceLabel:'TBD',image:'https://cdn.3dassets.dev/assets/35450/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/35450/v1/model.glb',meta:'Layer / Black / Drop 01',desc:'A dark long-sleeve field layer designed to sit cleanly under outerwear or stand alone.'},
  cap:{name:'HANDLER CAP',price:0,priceLabel:'TBD',image:'https://cdn.3dassets.dev/assets/33769/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/33769/v1/model.glb',meta:'Structured / Black / Drop 01',desc:'Structured black cap concept reserved for the Guardian K9 handler line.'},
  stickers:{name:'FIELD MARKS PACK',price:0,priceLabel:'TBD',image:'https://cdn.3dassets.dev/assets/2626/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/2626/v1/model.glb',meta:'Sticker set / Drop 01',desc:'A compact Guardian K9 marks and decal pack for cases, bottles, crates and field gear.'}
};
const order=['hoodie','zip','tee','long','cap','stickers'];

const q=s=>document.querySelector(s), qa=s=>[...document.querySelectorAll(s)];
const stageHost=q('#stageCanvas'), loading=q('#stageLoading'), stageProduct=q('#stageProduct'), stageIndex=q('#stageIndex');
const preview=q('#collectionPreview'), previewMedia=q('#previewMedia'), previewImage=q('#previewImage'), previewName=q('#previewName'), previewMeta=q('#previewMeta'), previewDesc=q('#previewDesc'), previewPrice=q('#previewPrice'), previewCounter=q('#previewCounter');
const overlay=q('#overlay'), panel=q('#productPanel'), panelImage=q('#panelImage'), panelName=q('#panelName'), panelPrice=q('#panelPrice'), panelDesc=q('#panelDesc'), panelCode=q('#panelCode');
const addBtn=q('#addBtn'), bagBtn=q('#bagBtn'), bagDrawer=q('#bagDrawer'), bagItems=q('#bagItems'), bagCount=q('#bagCount'), subtotal=q('#subtotal');

let activeKey='hoodie',activeProduct=null,currentProductGroup=null,selectedSize='M',bag=[];

/* reveal */
const io=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.12});
qa('.reveal').forEach(el=>io.observe(el));

/* preview parallax */
let ptx=0,pty=0,pcx=0,pcy=0;
preview.addEventListener('pointermove',e=>{
  const r=preview.getBoundingClientRect();
  ptx=((e.clientX-r.left)/r.width-.5)*2; pty=((e.clientY-r.top)/r.height-.5)*2;
});
preview.addEventListener('pointerleave',()=>{ptx=0;pty=0});
(function previewLoop(){
  pcx+=(ptx-pcx)*.08;pcy+=(pty-pcy)*.08;
  previewImage.style.transform='scale(1.07) translate('+(-pcx*10)+'px,'+(-pcy*8)+'px) rotateY('+(pcx*2.1)+'deg) rotateX('+(-pcy*1.5)+'deg)';
  requestAnimationFrame(previewLoop);
})();

/* product rows: hover, tilt, swipe activation */
qa('.product-row').forEach(row=>{
  const key=row.dataset.product;
  row.addEventListener('mouseenter',()=>setActiveProduct(key,false));
  row.addEventListener('focusin',()=>setActiveProduct(key,false));
  row.addEventListener('click',()=>setActiveProduct(key,true));
  row.addEventListener('dblclick',()=>openProduct(key));
  row.addEventListener('pointermove',e=>{
    if(matchMedia('(hover:hover)').matches){
      const r=row.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      row.style.transform='perspective(900px) rotateX('+(-y*3)+'deg) rotateY('+(x*3)+'deg) translateY(-2px)';
    }
  });
  row.addEventListener('pointerleave',()=>row.style.transform='');
});
if(matchMedia('(max-width:700px)').matches){
  const mobileIO=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(visible?.target)setActiveProduct(visible.target.dataset.product,false);
  },{root:q('#productStack'),threshold:[.55,.75]});
  qa('.product-row').forEach(r=>mobileIO.observe(r));
}

qa('.size').forEach(btn=>btn.addEventListener('click',()=>{
  qa('.size').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedSize=btn.textContent;
}));

q('#productClose').onclick=closePanels;q('#bagClose').onclick=closePanels;overlay.onclick=closePanels;
bagBtn.onclick=()=>{overlay.classList.add('show');bagDrawer.classList.add('show')};
q('#viewStage').onclick=()=>q('#showroom').scrollIntoView({behavior:'smooth'});
q('#previewQuick').onclick=()=>openProduct(activeKey);
q('#preview3d').onclick=()=>{q('#showroom').scrollIntoView({behavior:'smooth'});setTimeout(()=>setActiveProduct(activeKey,true),350)};
addBtn.onclick=()=>{
  const key=activeProduct||activeKey,p=productData[key];
  const parentCart=new URLSearchParams(location.search).get('parentCart')==='1';
  window.parent?.postMessage({type:'GUARDIAN_ADD_TO_BAG',productId:key,size:selectedSize,price:p.price,name:p.name},'*');
  if(parentCart){closePanels();return;}
  bag.push({key,size:selectedSize,price:p.price});renderBag();closePanels();bagDrawer.classList.add('show');overlay.classList.add('show');
};

function updatePreview(key){
  const p=productData[key],i=order.indexOf(key);
  previewImage.src=p.image;previewImage.alt=p.name;previewName.textContent=p.name;previewMeta.textContent=p.meta;previewDesc.textContent=p.desc;
  previewPrice.textContent=p.price?(p.priceLabel+' CAD'):'TBD';previewCounter.textContent=String(i+1).padStart(2,'0')+' / 06';
  qa('.product-row').forEach(r=>r.classList.toggle('active',r.dataset.product===key));
  stageProduct.textContent=p.name;stageIndex.textContent=String(i+1).padStart(2,'0')+' / 06';
}
function openProduct(key){
  activeProduct=key;setActiveProduct(key,true);const p=productData[key];
  panelName.textContent=p.name;panelPrice.textContent=p.price?(p.priceLabel+' CAD'):'TBD';panelDesc.textContent=p.desc;panelImage.src=p.image;panelCode.textContent='DROP 01 / GUARDIAN K9';
  overlay.classList.add('show');panel.classList.add('show');
  window.parent?.postMessage({type:'GUARDIAN_PRODUCT_SELECT',productId:key==='zip'?'zip-hoodie':key==='tee'?'tshirt':key==='long'?'long-sleeve':key},'*');
}
function closePanels(){overlay.classList.remove('show');panel.classList.remove('show');bagDrawer.classList.remove('show');activeProduct=null}
function renderBag(){
  bagCount.textContent=bag.length;
  if(!bag.length){bagItems.innerHTML='<div class="bag-empty">Your bag is empty.</div>';subtotal.textContent='$0';return}
  bagItems.innerHTML=bag.map(item=>{const p=productData[item.key];return '<div class="bag-item"><img src="'+p.image+'"><div><strong>'+p.name+'</strong><small>Size '+item.size+'</small></div><strong>'+(p.price?'$'+p.price:'TBD')+'</strong></div>'}).join('');
  subtotal.textContent='$'+bag.reduce((n,x)=>n+x.price,0)+' CAD';
}

/* 3D */
let renderer=null,scene=null,camera=null,controls=null,stageGroup=null,loader=null,store=null;
const cache=new Map();
function initFallbackStage(){
  stageHost.innerHTML='';
  const wrap=document.createElement('div');wrap.style.cssText='position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;perspective:1200px';
  const img=document.createElement('img');img.src=productData[activeKey].image;img.alt=productData[activeKey].name;
  img.style.cssText='width:62%;max-width:500px;max-height:78%;object-fit:contain;filter:grayscale(.9) brightness(.82) contrast(1.12);transform-style:preserve-3d;transition:transform .12s ease-out;box-shadow:0 36px 110px rgba(0,0,0,.55)';
  wrap.appendChild(img);stageHost.appendChild(wrap);window.__GK_FALLBACK_IMG__=img;
  let down=false,lastX=0,ry=-8,rx=2;const apply=()=>img.style.transform='rotateX('+rx+'deg) rotateY('+ry+'deg) translateZ(22px)';
  apply();
  wrap.addEventListener('pointerdown',e=>{down=true;lastX=e.clientX;wrap.setPointerCapture?.(e.pointerId)});
  wrap.addEventListener('pointermove',e=>{const r=wrap.getBoundingClientRect();if(down){ry+=(e.clientX-lastX)*.18;lastX=e.clientX}else{ry=((e.clientX-r.left)/r.width-.5)*16;rx=-((e.clientY-r.top)/r.height-.5)*8}apply()});
  wrap.addEventListener('pointerup',e=>{down=false;wrap.releasePointerCapture?.(e.pointerId)});
  loading?.classList.add('hide');
}

try{
  const probe=document.createElement('canvas');
  if(!probe.getContext('webgl2')&&!probe.getContext('webgl'))throw new Error('WebGL unavailable');
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;stageHost.appendChild(renderer.domElement);

  scene=new THREE.Scene();scene.background=new THREE.Color(0x080808);scene.fog=new THREE.Fog(0x080808,9,22);
  camera=new THREE.PerspectiveCamera(33,1,.05,80);camera.position.set(0,2.05,7.2);
  controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.055;controls.enablePan=false;controls.target.set(0,1.18,0);controls.minDistance=2.8;controls.maxDistance=8.2;controls.minPolarAngle=Math.PI*.29;controls.maxPolarAngle=Math.PI*.59;controls.rotateSpeed=.42;controls.zoomSpeed=.55;

  const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xbec8d6,0x121212,.7));
  const key=new THREE.RectAreaLight(0xffffff,13,5,3);key.position.set(2.4,5.2,4.5);key.lookAt(0,1,0);scene.add(key);
  const fill=new THREE.RectAreaLight(0x9cb5ff,8,4,3);fill.position.set(-3.8,3.2,2.4);fill.lookAt(0,1,0);scene.add(fill);
  const warm=new THREE.RectAreaLight(0xff6b3d,7,3,2);warm.position.set(3.5,2,-2.8);warm.lookAt(0,1,-1);scene.add(warm);

  const floorMat=new THREE.MeshPhysicalMaterial({color:0x0d0d0d,roughness:.18,metalness:.58,clearcoat:.45,clearcoatRoughness:.2,envMapIntensity:1.25});
  const floor=new THREE.Mesh(new THREE.CircleGeometry(2.8,96),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=.01;floor.receiveShadow=true;scene.add(floor);
  const plinth=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.55,.18,80),new THREE.MeshPhysicalMaterial({color:0x111111,roughness:.24,metalness:.6,clearcoat:.55,clearcoatRoughness:.18}));
  plinth.position.y=.09;plinth.receiveShadow=true;scene.add(plinth);

  loader=new GLTFLoader();stageGroup=new THREE.Group();scene.add(stageGroup);

  function tune(root,isStore=false){
    root.traverse(o=>{if(!o.isMesh)return;o.castShadow=!isStore;o.receiveShadow=true;const mats=Array.isArray(o.material)?o.material:[o.material];o.material=mats.map(m=>{const n=m.clone();if(n.color)n.color.multiplyScalar(isStore?.72:.86);if('roughness'in n)n.roughness=Math.min(.82,Math.max(.28,n.roughness??.6));if('metalness'in n)n.metalness=Math.min(.5,n.metalness??0);n.envMapIntensity=isStore?.8:1.35;return n});if(o.material.length===1)o.material=o.material[0]});
  }
  function normalize(root,target=1.95){
    const b=new THREE.Box3().setFromObject(root),s=b.getSize(new THREE.Vector3()),scale=target/Math.max(s.x,s.y,s.z);root.scale.multiplyScalar(scale);
    const b2=new THREE.Box3().setFromObject(root),c=b2.getCenter(new THREE.Vector3());root.position.sub(c);const b3=new THREE.Box3().setFromObject(root);root.position.y-=b3.min.y;
  }
  async function loadStore(){
    try{const g=await loader.loadAsync('https://cdn.3dassets.dev/assets/35480/v1/model.glb');store=g.scene;tune(store,true);store.scale.setScalar(1.06);store.position.set(0,-.02,-3.25);scene.add(store)}catch(e){console.warn('store',e)}
  }
  async function getModel(key){
    if(cache.has(key))return cache.get(key).clone(true);
    const p=productData[key];if(!p.model)return null;
    const g=await loader.loadAsync(p.model),root=g.scene;tune(root,false);normalize(root,key==='cap'?0.95:key==='stickers'?0.8:key==='tee'?1.6:1.9);cache.set(key,root);return root.clone(true);
  }
  window.__set3DProduct=async key=>{
    try{
      const next=await getModel(key);if(!next)return;
      if(currentProductGroup)stageGroup.remove(currentProductGroup);
      currentProductGroup=next;currentProductGroup.position.set(0,.19,.35);currentProductGroup.rotation.y=-.12;stageGroup.add(currentProductGroup);
    }catch(e){console.warn('product',key,e)}
  };
  loadStore();window.__set3DProduct(activeKey);

  let mx=0,my=0,tx=0,ty=0;
  stageHost.addEventListener('pointermove',e=>{const r=stageHost.getBoundingClientRect();tx=((e.clientX-r.left)/r.width-.5)*2;ty=((e.clientY-r.top)/r.height-.5)*2});
  function resize(){const w=stageHost.clientWidth,h=stageHost.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false)}
  new ResizeObserver(resize).observe(stageHost);resize();
  function animate(){
    requestAnimationFrame(animate);mx+=(tx-mx)*.03;my+=(ty-my)*.03;
    if(currentProductGroup){currentProductGroup.rotation.y+=.00115;currentProductGroup.position.y=.19+Math.sin(performance.now()*.0011)*.008}
    camera.position.x+=(mx*.09-camera.position.x)*.015;controls.update();renderer.render(scene,camera);
  }animate();
  setTimeout(()=>loading?.classList.add('hide'),500);
}catch(err){console.warn('fallback',err);initFallbackStage()}

async function setActiveProduct(key,force=false){
  if(!productData[key]||(!force&&key===activeKey))return;
  activeKey=key;updatePreview(key);
  if(window.__GK_FALLBACK_IMG__)window.__GK_FALLBACK_IMG__.src=productData[key].image;
  if(window.__set3DProduct)window.__set3DProduct(key);
}
updatePreview(activeKey);

window.addEventListener('message',e=>{
  const d=e.data||{};if(d.type==='GUARDIAN_PRODUCT_VIEW'&&currentProductGroup)currentProductGroup.rotation.y=d.view==='back'?Math.PI:0;
  if(d.type==='GUARDIAN_RETURN_HOME'){closePanels();setActiveProduct('hoodie',true)}
});


// Base44 embed bridge: keep iframe height synchronized and surface product events.
(function(){
  const embedded = new URLSearchParams(location.search).get('embed') === '1';
  if(!embedded) return;
  const sendHeight = () => {
    const height = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    window.parent?.postMessage({type:'GUARDIAN_EMBED_HEIGHT',height},'*');
  };
  const ro = new ResizeObserver(sendHeight);
  ro.observe(document.body);
  addEventListener('load',sendHeight);
  setTimeout(sendHeight,300);
  setTimeout(sendHeight,1200);
  document.querySelectorAll('[data-product]').forEach(el=>{
    el.addEventListener('mouseenter',()=>{
      window.parent?.postMessage({type:'GUARDIAN_PRODUCT_HOVER',productId:el.dataset.product},'*');
    });
  });
})();
