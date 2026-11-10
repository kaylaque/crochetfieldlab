// Node-only smoke test of the prototype's state machine with simulated DOM.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const listeners={};
function element(id='') { return {id,children:[],hidden:false,disabled:false,textContent:'',value:'',type:'',style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},attrs:{},addEventListener(k,fn){listeners[id+':'+k]=fn;},setAttribute(k,v){this.attrs[k]=v;},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},getBoundingClientRect(){return {width:620,height:385}},getContext(){return ctx2d;},setPointerCapture(){}}; }
const ctx2d=new Proxy({createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}},canvas:{}},{get(t,k){return k in t?t[k]:(()=>{});}});
const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)}
const nav=[element('nav-learn'),element('nav-journal')];nav[0].dataset.view='learn';nav[1].dataset.view='journal';
const doc={getElementById:el,createElement:()=>element('dynamic'),querySelectorAll:()=>nav,body:{style:{}},addEventListener(){},hidden:false};
const storage=new Map();const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const rafCbs=[];
const matchMediaResult={matches:false};
const sandbox={document:doc,window:{addEventListener(){}},localStorage,matchMedia:()=>matchMediaResult,navigator:{},devicePixelRatio:1,requestAnimationFrame(fn){rafCbs.push(fn);return rafCbs.length},cancelAnimationFrame(){},scrollTo(){},performance:{now:()=>0},confirm:()=>true,console,Date,Math};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../app.js','utf8'),sandbox,{filename:'app.js'});
const appSource=fs.readFileSync(__dirname+'/../app.js','utf8');

// New playback feature: a fresh DOM state per check keeps the journal/count state deterministic.
function makeTestEnv({reducedMotion=false}={}){
  const localListeners={};
  const localElements=new Map();
  const localStorage=new Map();
  function localElement(id=''){return {id,children:[],hidden:false,disabled:false,textContent:'',value:'',type:'',style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},attrs:{},addEventListener(k,fn){localListeners[id+':'+k]=fn;},setAttribute(k,v){this.attrs[k]=v;},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},getBoundingClientRect(){return {width:620,height:385}},getContext(){return ctx2d;},setPointerCapture(){}};}
  function locEl(id){if(!localElements.has(id))localElements.set(id,localElement(id));return localElements.get(id)}
  const nav=[localElement('nav-learn'),localElement('nav-journal')];nav[0].dataset.view='learn';nav[1].dataset.view='journal';
  const reduced={matches:reducedMotion};
  const localRaf=[];let currentHidden=false;
  const localDoc={getElementById:locEl,createElement:()=>localElement('dynamic'),querySelectorAll:()=>nav,body:{style:{}},addEventListener(){},hidden:false,get hidden(){return currentHidden},set hidden(v){currentHidden=v}};
  const localSandbox={document:localDoc,window:{addEventListener(){}},localStorage:{getItem:k=>localStorage.get(k)||null,setItem:(k,v)=>localStorage.set(k,v)},matchMedia:()=>reduced,navigator:{},devicePixelRatio:1,requestAnimationFrame(fn){localRaf.push(fn);return localRaf.length},cancelAnimationFrame(){},scrollTo(){},performance:{now:()=>0},confirm:()=>true,console,Date,Math};
  vm.createContext(localSandbox);
  vm.runInContext(appSource,localSandbox,{filename:'app.js'});
  const callUI=(id,kind)=>localListeners[id+':'+kind]();
  return {doc:localDoc,storage:localStorage,el:locEl,callUI,sandbox:localSandbox,raf:localRaf,
    storedChains(){const last=[...localStorage.keys()].pop();return JSON.parse(localStorage.get(last)).chains;},
    storedEvents(){const last=[...localStorage.keys()].pop();return JSON.parse(localStorage.get(last)).events;},
    runTicks(startTs,count=10){let ts=startTs;localRaf.forEach(fn=>{for(let i=0;i<count;i++){ts+=32;fn(ts);}});return ts;},
  };
}

assert.equal(el('stepTitle').textContent,'Meet your tools.');
assert.equal(el('stepList').children.length,8);
listeners['nextButton:click']();assert.equal(el('stepTitle').textContent,'Make a slip knot.');
// Work through a counter step by simulated UI click.
const buttons=el('stepList').children.map(x=>x.children[0]);
buttons[4].addEventListener; // step list is rebuilt on every render; use latest
listeners['dynamic:click'];
// Directly use the exposed navigational state via vm, not private implementation details.
vm.runInContext('changeStep(4)',sandbox);
for(let i=0;i<11;i++) listeners['incrementCount:click']();
assert.equal(el('countValue').textContent,'11');
assert.equal(JSON.parse(storage.values().next().value).chains,11);
listeners['pauseButton:click']();assert.equal(el('pauseOverlay').hidden,false);
listeners['resumeButton:click']();assert.equal(el('pauseOverlay').hidden,true);
vm.runInContext('changeStep(6)',sandbox);
for(let i=0;i<10;i++) listeners['incrementCount:click']();
listeners['newRow:click']();assert.equal(el('rowIndicator').textContent,'Row 2 · 10 single crochets total');
assert.equal(el('countValue').textContent,'0');
listeners['clearHistory:click']();assert.equal(JSON.parse(storage.values().next().value).events.length,0);
console.log('PASS: navigation, 11 chains, persistence, pause/resume, 10 stitches, row advance, clear journal.');

// Knot playback: scrub to the end, phase steps seek not count, manual counters untouched.
const knotEnv=makeTestEnv();
vm.runInContext('changeStep(1)',knotEnv.sandbox);
knotEnv.el('viewerTimeline').value='1000';
knotEnv.callUI('viewerTimeline','input');
assert.match(knotEnv.el('viewerPhaseText').textContent,/Tighten the sliding knot/);
assert.equal(knotEnv.el('viewerPhaseText').textContent,'Phase 5 of 5 · Tighten the sliding knot');
assert.equal(knotEnv.el('viewerPlaybackControls').hidden,false);
assert.equal(knotEnv.el('viewerPlayButton').hidden,false);
knotEnv.callUI('viewerPreviousPhase','click');
assert.equal(knotEnv.el('viewerPhaseText').textContent,'Phase 4 of 5 · Place loop on hook');
assert.equal(knotEnv.storedChains(),0);
assert.deepEqual(knotEnv.storedEvents(),[]); // scrubbing never writes journal
console.log('PASS: knot timeline scrub and phase stepping.');

// Motion timeline has exactly four phases and starts at the first one.
const motionEnv=makeTestEnv();
vm.runInContext('changeStep(3)',motionEnv.sandbox);
motionEnv.el('viewerTimeline').value='0';
motionEnv.callUI('viewerTimeline','input');
assert.equal(motionEnv.el('viewerPhaseText').textContent,'Phase 1 of 4 · One loop on hook');
assert.equal(motionEnv.el('viewerPlaybackControls').hidden,false);
console.log('PASS: motion timeline starts with one loop on the hook.');

// Chain counting is manual while the same playhead persists across '+ Stitch'.
const chainEnv=makeTestEnv();
vm.runInContext('changeStep(4)',chainEnv.sandbox);
chainEnv.callUI('viewerPlayButton','click');
const phaseAfterPlay=chainEnv.el('viewerPhaseText').textContent;
chainEnv.callUI('incrementCount','click');
chainEnv.callUI('incrementCount','click');
assert.equal(chainEnv.el('countValue').textContent,'2');
assert.equal(chainEnv.storedChains(),2);
assert.equal(chainEnv.el('viewerPhaseText').textContent,phaseAfterPlay);
console.log('PASS: chain count is manual; playback continues unchanged.');

// Frame simulation: play advances slider and phase; pause freezes it.
const timeEnv=makeTestEnv();
vm.runInContext('changeStep(1)',timeEnv.sandbox);
timeEnv.el('viewerTimeline').value='0';
timeEnv.callUI('viewerTimeline','input');
timeEnv.callUI('viewerPlayButton','click');
const ts=timeEnv.runTicks(1200,10);
assert.equal(timeEnv.el('viewerPhaseText').textContent,'Phase 1 of 5 · Lay yarn');
const sliderAfterPlay=Number(timeEnv.el('viewerTimeline').value);
assert.ok(sliderAfterPlay>0&&sliderAfterPlay!==1200,'frame-driven playhead moved slider');
timeEnv.callUI('viewerPlayButton','click'); // pause
const frozen=Number(timeEnv.el('viewerTimeline').value);
const frozenText=timeEnv.el('viewerPhaseText').textContent;
timeEnv.runTicks(ts+32,10);
assert.equal(Number(timeEnv.el('viewerTimeline').value),frozen);
assert.equal(timeEnv.el('viewerPhaseText').textContent,frozenText);
console.log('PASS: frame callback advances playback; pause stops it.');

// Reduced motion: lesson playback starts paused.
const reducedEnv=makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(1)',reducedEnv.sandbox);
reducedEnv.runTicks(1000,10);
assert.equal(reducedEnv.el('viewerPhaseText').textContent,'Phase 1 of 5 · Lay yarn');
assert.equal(reducedEnv.el('viewerPlayButton').textContent,'▶');
assert.equal(reducedEnv.el('viewerPlayButton').attrs['aria-label'],'Play process');
console.log('PASS: reduced motion starts the lesson paused.');

console.log('PASS: knot/chain playback regression suite.');
