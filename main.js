import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
window.__GK_SHOWROOM_READY__=true;

const productData={
  hoodie:{name:'FIELD HOODIE',price:148,priceLabel:'$148',image:'https://cdn.3dassets.dev/assets/27162/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/35452/v1/model.glb',desc:'Heavyweight pullover hoodie with a field-first silhouette, restrained branding and a substantial hand feel.'},
  zip:{name:'OPERATOR ZIP',price:168,priceLabel:'$168',image:'https://cdn.3dassets.dev/assets/27161/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/27161/v1/model.glb',desc:'Full-zip technical layer with a hooded outerwear profile and a clean, monochrome finish.'},
  tee:{name:'STREET TEE',price:62,priceLabel:'$62',image:'https://cdn.3dassets.dev/assets/35447/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/35447/v1/model.glb',desc:'Heavy cotton tee cut for an easy straight fit. Minimal exterior treatment keeps the silhouette doing the work.'},
  long:{name:'NIGHT LONG SLEEVE',price:0,priceLabel:'TBD',image:'https://cdn.3dassets.dev/assets/35450/v1/poster.webp',model:'https://cdn.3dassets.dev/assets/35450/v1/model.glb',desc:'A dark long-sleeve field layer designed to sit cleanly under outerwear or stand alone.'},
  cap:{name:'HANDLER CAP',price:0,priceLabel:'TBD',image:null,model:null,desc:'Structured black cap concept reserved for the Guardian K9 handler line.'},
  stickers:{name:'FIELD MARKS PACK',price:0,priceLabel:'TBD',image:null,model:null,desc:'A compact Guardian K9 marks and decal pack for cases, bottles, crates and field gear.'}
};

const stageHost=document.getElementById('stageCanvas');
const loading=document.getElementById('stageLoading');
if(loading){setTimeout(()=>loading.classList.add('hide'),250);}
const stageProduct=document.getElementById('stageProduct');
const overlay=document.getElementById('overlay');
const panel=document.getElementById('productPanel');
const panelImage=document.getElementById('panelImage');
const panelName=document.getElementById('panelName');
const panelPrice=document.getElementById('panelPrice');
const panelDesc=document.getElementById('panelDesc');
const panelCode=document.getElementById('panelCode');
const addBtn=document.getElementById('addBtn');
const bagBtn=document.getElementById('bagBtn');
const bagDrawer=document.getElementById('bagDrawer');
const bagItems=document.getElementById('bagItems');
const bagCount=document.getElementById('bagCount');
const subtotal=document.getElementById('subtotal');

let activeKey='hoodie',activeProduct=null,currentProductGroup=null;
let bag=[],selectedSize='M';

function makeFallbackArt(key){
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1400;
  const c=canvas.getContext('2d');
  const g=c.createLinearGradient(0,0,1200,1400);g.addColorStop(0,'#232323');g.addColorStop(1,'#090909');
  c.fillStyle=g;c.fillRect(0,0,1200,1400);
  c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=2;
  for(let i=-500;i<1700;i+=85){c.beginPath();c.moveTo(i,0);c.lineTo(i-600,1400);c.stroke()}
  c.fillStyle='#2b2b2b';c.font='900 310px Arial';c.textAlign='center';c.fillText('GK',600,780);
  c.fillStyle='#8c8c88';c.font='700 34px Arial';c.letterSpacing='8px';c.fillText(key==='cap'?'HANDLER CAP':'FIELD MARKS',600,930);
  return canvas.toDataURL('image/jpeg',.88);
}
productData.cap.image=makeFallbackArt('cap');
productData.stickers.image=makeFallbackArt('stickers');

document.querySelectorAll('.card').forEach(card=>{
  const key=card.dataset.product;
  if((key==='cap'||key==='stickers')){
    const img=card.querySelector('img');
    img.src=productData[key].image;
    img.style.filter='none';
  }
  card.addEventListener('mouseenter',()=>setActiveProduct(key,false));
  card.addEventListener('click',()=>openProduct(key));
});
document.querySelectorAll('.size').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.size').forEach(b=>b.classList.remove('active'));btn.classList.add('active');selectedSize=btn.textContent;
}));
document.getElementById('productClose').onclick=closePanels;
document.getElementById('bagClose').onclick=closePanels;
overlay.onclick=closePanels;
bagBtn.onclick=()=>{overlay.classList.add('show');bagDrawer.classList.add('show')};
document.getElementById('viewStage').onclick=()=>document.getElementById('showroom').scrollIntoView({behavior:'smooth'});
addBtn.onclick=()=>{
  const p=productData[activeProduct||activeKey];
  bag.push({key:activeProduct||activeKey,size:selectedSize,price:p.price});
  renderBag(); closePanels(); bagDrawer.classList.add('show'); overlay.classList.add('show');
};

function openProduct(key){
  activeProduct=key; const p=productData[key]; setActiveProduct(key,true);
  panelName.textContent=p.name; panelPrice.textContent=p.priceLabel+(p.price?' CAD':'');
  panelDesc.textContent=p.desc;panelImage.src=p.image;panelCode.textContent='DROP 01 / GUARDIAN K9';
  overlay.classList.add('show');panel.classList.add('show');
  window.parent?.postMessage({type:'GUARDIAN_PRODUCT_SELECT',productId:key==='zip'?'zip-hoodie':key==='tee'?'tshirt':key==='long'?'long-sleeve':key},'*');
}
function closePanels(){overlay.classList.remove('show');panel.classList.remove('show');bagDrawer.classList.remove('show');activeProduct=null}
function renderBag(){
  bagCount.textContent=bag.length;
  if(!bag.length){bagItems.innerHTML='<div class="bag-empty">Your bag is empty.</div>';subtotal.textContent='$0';return}
  bagItems.innerHTML=bag.map((item,i)=>{
    const p=productData[item.key];
    return '<div class="bag-item"><img src="'+p.image+'"><div><strong>'+p.name+'</strong><small>Size '+item.size+'</small></div><strong>'+(p.price?'$'+p.price:'TBD')+'</strong></div>'
  }).join('');
  const total=bag.reduce((n,x)=>n+x.price,0);subtotal.textContent='$'+total+' CAD';
}

let renderer=null;
function initFallbackStage(){
  stageHost.innerHTML='';
  const wrap=document.createElement('div');
  wrap.style.cssText='position:absolute;inset:0;display:grid;place-items:center;overflow:hidden;perspective:1100px';
  const img=document.createElement('img');
  img.src=productData[activeKey].image;
  img.alt=productData[activeKey].name;
  img.style.cssText='width:58%;max-width:430px;max-height:72%;object-fit:contain;filter:grayscale(1) brightness(.8) contrast(1.18);transform-style:preserve-3d;transition:transform .18s ease-out,filter .25s;box-shadow:0 32px 90px rgba(0,0,0,.45)';
  wrap.appendChild(img);stageHost.appendChild(wrap);
  let down=false,lastX=0,rotY=-8,rotX=2;
  const apply=()=>img.style.transform='rotateX('+rotX+'deg) rotateY('+rotY+'deg) translateZ(18px)';
  apply();
  wrap.addEventListener('pointerdown',e=>{down=true;lastX=e.clientX;wrap.setPointerCapture?.(e.pointerId)});
  wrap.addEventListener('pointermove',e=>{
    if(down){rotY+=(e.clientX-lastX)*.18;lastX=e.clientX;apply();}
    else{
      const r=wrap.getBoundingClientRect(),nx=(e.clientX-r.left)/r.width-.5,ny=(e.clientY-r.top)/r.height-.5;
      rotY=nx*12;rotX=-ny*7;apply();
    }
  });
  wrap.addEventListener('pointerup',e=>{down=false;wrap.releasePointerCapture?.(e.pointerId)});
  window.__GK_FALLBACK_IMG__=img;
  if(loading)loading.classList.add('hide');
}
try{
  const probe=document.createElement('canvas');
  if(!probe.getContext('webgl2')) throw new Error('WebGL2 unavailable');
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setSize(stageHost.clientWidth,stageHost.clientHeight);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.domElement.style.width='100%';renderer.domElement.style.height='100%';
  stageHost.appendChild(renderer.domElement);
}catch(err){
  console.warn('Guardian K9 3D renderer fallback',err);
  initFallbackStage();
}

if(renderer){
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x090909);
scene.fog=new THREE.FogExp2(0x090909,.055);

const camera=new THREE.PerspectiveCamera(34,stageHost.clientWidth/stageHost.clientHeight,.05,80);
camera.position.set(0,2.0,7.5);

const controls=new OrbitControls(camera,renderer.domElement);
controls.enableDamping=true;controls.dampingFactor=.06;controls.enablePan=false;
controls.target.set(0,1.15,0);controls.minDistance=3;controls.maxDistance=9;
controls.minPolarAngle=Math.PI*.30;controls.maxPolarAngle=Math.PI*.58;controls.rotateSpeed=.38;controls.zoomSpeed=.5;

scene.add(new THREE.HemisphereLight(0xb8c5d8,0x101010,.72));
const key=new THREE.SpotLight(0xffffff,78,18,Math.PI/5,.55,1.5);key.position.set(2.5,6,4);key.target.position.set(0,1,0);key.castShadow=true;scene.add(key,key.target);
const fill=new THREE.SpotLight(0xb7c8ff,32,16,Math.PI/4,.7,1.6);fill.position.set(-4,3.5,2);fill.target.position.set(0,1,-1);scene.add(fill,fill.target);
const warm=new THREE.PointLight(0xff4a22,12,7,2);warm.position.set(4,1.8,-3);scene.add(warm);

const floor=new THREE.Mesh(new THREE.CircleGeometry(2.3,64),new THREE.MeshStandardMaterial({color:0x101010,roughness:.42,metalness:.25}));
floor.rotation.x=-Math.PI/2;floor.position.y=.01;floor.receiveShadow=true;scene.add(floor);
const ring=new THREE.Mesh(new THREE.TorusGeometry(1.75,.008,8,96),new THREE.MeshBasicMaterial({color:0x585858,transparent:true,opacity:.55}));
ring.rotation.x=Math.PI/2;ring.position.y=.018;scene.add(ring);

const loader=new GLTFLoader();
const cache=new Map();
const stageGroup=new THREE.Group();scene.add(stageGroup);

function darkenObject(root,amount=.32){
  root.traverse(o=>{
    if(!o.isMesh)return;
    o.castShadow=true;o.receiveShadow=true;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    o.material=mats.map(m=>{
      const n=m.clone();
      if(n.color)n.color.lerp(new THREE.Color(0x080808),amount);
      if('roughness' in n)n.roughness=Math.max(.48,n.roughness??.65);
      if('metalness' in n)n.metalness=Math.min(.3,n.metalness??0);
      return n;
    });
    if(o.material.length===1)o.material=o.material[0];
  });
}
function normalize(root,target=1.8){
  const box=new THREE.Box3().setFromObject(root),size=box.getSize(new THREE.Vector3());
  const scale=target/Math.max(size.x,size.y,size.z);root.scale.multiplyScalar(scale);
  const b2=new THREE.Box3().setFromObject(root),c=b2.getCenter(new THREE.Vector3());
  root.position.sub(c);const b3=new THREE.Box3().setFromObject(root);root.position.y-=b3.min.y;
}
async function loadStore(){
  try{
    const gltf=await loader.loadAsync('https://cdn.3dassets.dev/assets/35480/v1/model.glb');
    const store=gltf.scene;darkenObject(store,.12);
    store.scale.setScalar(1.02);store.position.set(0,-.03,-2.9);
    store.traverse(o=>{if(o.isMesh){const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>{if(m.color)m.color.multiplyScalar(.55)})}});
    scene.add(store);
  }catch(e){console.warn('Store scene failed',e)}
}
async function getModel(key){
  if(cache.has(key))return cache.get(key).clone(true);
  const p=productData[key];if(!p.model)return null;
  const gltf=await loader.loadAsync(p.model);
  const root=gltf.scene;darkenObject(root,.55);normalize(root,key==='tee'?1.45:1.75);
  cache.set(key,root);return root.clone(true);
}
async function setActiveProduct(key,force=false){
  if(!productData[key]||(!force&&key===activeKey))return;
  activeKey=key;stageProduct.textContent=productData[key].name;if(window.__GK_FALLBACK_IMG__)window.__GK_FALLBACK_IMG__.src=productData[key].image;
  if(!productData[key].model)return;
  try{
    const next=await getModel(key);
    if(currentProductGroup)stageGroup.remove(currentProductGroup);
    currentProductGroup=next;currentProductGroup.position.set(0,.03,.55);currentProductGroup.rotation.y=-.18;
    stageGroup.add(currentProductGroup);
  }catch(e){console.warn('Product model failed',key,e)}
}
window.addEventListener('message',e=>{
  const d=e.data||{};
  if(d.type==='GUARDIAN_PRODUCT_VIEW'&&currentProductGroup)currentProductGroup.rotation.y=d.view==='back'?Math.PI:0;
  if(d.type==='GUARDIAN_RETURN_HOME'){closePanels();setActiveProduct('hoodie',true)}
});

let mx=0,my=0,tmx=0,tmy=0;
stageHost.addEventListener('pointermove',e=>{const r=stageHost.getBoundingClientRect();tmx=((e.clientX-r.left)/r.width-.5)*2;tmy=((e.clientY-r.top)/r.height-.5)*2});
function animate(){
  requestAnimationFrame(animate);
  mx+=(tmx-mx)*.035;my+=(tmy-my)*.035;
  if(currentProductGroup){
    currentProductGroup.rotation.y+=.0017;
    currentProductGroup.position.y=.03+Math.sin(performance.now()*.0012)*.012;
  }
  if(!controls.enabled){camera.position.x+=((mx*.18)-camera.position.x)*.02}
  controls.update();renderer.render(scene,camera);
}
function resize(){
  const w=stageHost.clientWidth,h=stageHost.clientHeight;if(!w||!h)return;
  camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
}
new ResizeObserver(resize).observe(stageHost);

animate();
setTimeout(()=>loading.classList.add('hide'),650);
Promise.allSettled([loadStore(),setActiveProduct('hoodie',true)]).then(()=>setTimeout(()=>loading?.classList.add('hide'),200));
}else{
  stageProduct.textContent=productData[activeKey].name;
}
