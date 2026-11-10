// Node-only smoke test of the prototype's state machine with simulated DOM.
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const listeners={};
function element(id='') { return {id,children:[],hidden:false,disabled:false,textContent:'',value:'',style:{},dataset:{},classList:{toggle(){},add(){},remove(){}},attrs:{},addEventListener(k,fn){listeners[id+':'+k]=fn;},setAttribute(k,v){this.attrs[k]=v;},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},getBoundingClientRect(){return {width:620,height:385}},getContext(){return ctx2d;},setPointerCapture(){}}; }
const ctx2d=new Proxy({createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}},canvas:{}},{get(t,k){return k in t?t[k]:(()=>{});}});
const elements=new Map();function el(id){if(!elements.has(id))elements.set(id,element(id));return elements.get(id)}
const nav=[element('nav-learn'),element('nav-journal')];nav[0].dataset.view='learn';nav[1].dataset.view='journal';
const doc={getElementById:el,createElement:()=>element('dynamic'),querySelectorAll:()=>nav,body:{style:{}},addEventListener(){}};
const storage=new Map();const localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const sandbox={document:doc,window:{addEventListener(){}},localStorage,matchMedia:()=>({matches:false}),navigator:{},devicePixelRatio:1,requestAnimationFrame(){return 1},cancelAnimationFrame(){},scrollTo(){},performance:{now:()=>0},confirm:()=>true,console,Date,Math};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(__dirname+'/../app.js','utf8'),sandbox,{filename:'app.js'});
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
