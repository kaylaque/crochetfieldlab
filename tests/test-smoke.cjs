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
const appSource=fs.readFileSync(__dirname+'/../app.js','utf8');
const motionSource=fs.readFileSync(__dirname+'/../stitch-motion.js','utf8');
const rendererSource=fs.readFileSync(__dirname+'/../stitch-renderer.js','utf8');
const drawSource=fs.readFileSync(__dirname+'/../stitch-draw.js','utf8');
// Same load order as index.html: motion model, then renderer, then the app.
function loadApp(context){
  vm.runInContext(motionSource,context,{filename:'stitch-motion.js'});
  vm.runInContext(drawSource,context,{filename:'stitch-draw.js'});
  vm.runInContext(rendererSource,context,{filename:'stitch-renderer.js'});
  vm.runInContext(appSource,context,{filename:'app.js'});
}
vm.createContext(sandbox);
loadApp(sandbox);

// New playback feature: a fresh DOM state per check keeps the journal/count state deterministic.
function makeTestEnv({reducedMotion=false}={}){
  const localListeners={};
  const localElements=new Map();
  const localStorage=new Map();
  function localElement(id=''){const classes=new Set();return {id,children:[],hidden:false,disabled:false,textContent:'',value:'',type:'',style:{},dataset:{},classList:{toggle(name,on){if(on)classes.add(name);else classes.delete(name)},add(name){classes.add(name)},remove(name){classes.delete(name)},contains(name){return classes.has(name)}},attrs:{},addEventListener(k,fn){localListeners[id+':'+k]=fn;},setAttribute(k,v){this.attrs[k]=v;},replaceChildren(...children){this.children=children;},append(...children){this.children.push(...children);},getBoundingClientRect(){return {width:620,height:385}},getContext(){return ctx2d;},play:async()=>{},setPointerCapture(){} };}
  function locEl(id){if(!localElements.has(id))localElements.set(id,localElement(id));return localElements.get(id)}
  const nav=[localElement('nav-learn'),localElement('nav-journal')];nav[0].dataset.view='learn';nav[1].dataset.view='journal';
  const reduced={matches:reducedMotion};
  const localRaf=[];let currentHidden=false;
  const localDoc={getElementById:locEl,createElement:()=>localElement('dynamic'),querySelectorAll:()=>nav,body:{style:{}},addEventListener(){},hidden:false,get hidden(){return currentHidden},set hidden(v){currentHidden=v}};
  const localSandbox={document:localDoc,window:{addEventListener(){}},localStorage:{getItem:k=>localStorage.get(k)||null,setItem:(k,v)=>localStorage.set(k,v)},matchMedia:()=>reduced,navigator:{},devicePixelRatio:1,requestAnimationFrame(fn){localRaf.push(fn);return localRaf.length},cancelAnimationFrame(){},scrollTo(){},performance:{now:()=>0},confirm:()=>true,console,Date,Math};
  vm.createContext(localSandbox);
  loadApp(localSandbox);
  const callUI=(id,kind)=>localListeners[id+':'+kind]();
  return {doc:localDoc,storage:localStorage,el:locEl,callUI,sandbox:localSandbox,raf:localRaf,
    storedChains(){const last=[...localStorage.keys()].pop();return JSON.parse(localStorage.get(last)).chains;},
    storedEvents(){const last=[...localStorage.keys()].pop();return JSON.parse(localStorage.get(last)).events;},
    runTicks(startTs,count=10){let ts=startTs;localRaf.forEach(fn=>{for(let i=0;i<count;i++){ts+=32;fn(ts);}});return ts;},
  };
}
// Camera acquisition is explicit; denied access stays retryable and stopping closes the stream.
(async()=>{
  const cameraEnv=makeTestEnv({reducedMotion:true});
  let requests=0,stops=0;
  cameraEnv.sandbox.navigator.mediaDevices={getUserMedia:async()=>{requests++;throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}};
  assert.equal(requests,0);
  await cameraEnv.callUI('cameraButton','click');
  assert.equal(requests,1);
  assert.match(cameraEnv.el('visionStatus').textContent,/permission was blocked/i);
  cameraEnv.sandbox.navigator.mediaDevices={getUserMedia:async()=>{requests++;return {getTracks:()=>[{stop(){stops++;}}]};}};
  await cameraEnv.callUI('cameraButton','click');
  assert.equal(cameraEnv.el('cameraButton').attrs['aria-expanded'],'true');
  await cameraEnv.callUI('cameraButton','click');
  assert.equal(stops,1);
  vm.runInContext("setView('journal')",cameraEnv.sandbox);
  assert.equal(stops,1);
  const pendingEnv=makeTestEnv({reducedMotion:true});
  let finishRequest,staleStops=0;
  pendingEnv.sandbox.navigator.mediaDevices={getUserMedia:()=>new Promise(resolve=>{finishRequest=resolve;})};
  const pendingActivation=pendingEnv.callUI('cameraButton','click');
  vm.runInContext("setView('journal')",pendingEnv.sandbox);
  finishRequest({getTracks:()=>[{stop(){staleStops++;}}]});
  await pendingActivation;
  assert.equal(staleStops,1,'a permission result arriving after navigation is stopped immediately');
  assert.equal(pendingEnv.el('cameraButton').attrs['aria-expanded'],'false');
  console.log('PASS: camera is explicit, retryable after denial, and stale streams are stopped.');
})().catch(error=>{console.error(error);process.exitCode=1;});

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
// Feedback belongs to the selected lesson; only an actual lesson change clears it.
const feedbackEnv=makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(5)',feedbackEnv.sandbox);
feedbackEnv.callUI('needHelp','click');
const singleCrochetTip=feedbackEnv.el('reviewFeedback').textContent;
assert.match(singleCrochetTip,/Two loops/);
vm.runInContext('changeStep(5)',feedbackEnv.sandbox);
assert.equal(feedbackEnv.el('reviewFeedback').textContent,singleCrochetTip);
vm.runInContext("setView('journal'); setView('learn')",feedbackEnv.sandbox);
assert.equal(feedbackEnv.el('reviewFeedback').textContent,singleCrochetTip);
vm.runInContext('changeStep(6)',feedbackEnv.sandbox);
assert.equal(feedbackEnv.el('reviewFeedback').textContent,'');
vm.runInContext('changeStep(7)',feedbackEnv.sandbox);
assert.equal(feedbackEnv.el('reviewFeedback').textContent,'');
console.log('PASS: feedback stays with its lesson and clears when lesson changes.');
// Single crochet must expose five connected, structurally valid phases from the real model.
const singleMotion=sandbox.window.StitchMotion.SINGLE_MOTION;
assert.ok(singleMotion,'single-crochet motion exists');
assert.deepEqual(Array.from(singleMotion.phases,p=>p.name),['Insert','Yarn over','Pull up a loop','Yarn over again','Pull through both']);
assert.equal(singleMotion.durationMs,6000);
for(let i=0;i<singleMotion.phases.length;i++){
  const phase=singleMotion.phases[i];
  for(const id of ['tail','working','active']){
    assert.equal(phase.from.paths[id].length,phase.to.paths[id].length);
    for(const point of [...phase.from.paths[id],...phase.to.paths[id]])assert.ok(point.length===3&&point.every(Number.isFinite));
    if(i)assert.deepEqual(Array.from(phase.from.paths[id],p=>Array.from(p)),Array.from(singleMotion.phases[i-1].to.paths[id],p=>Array.from(p)));
  }
}
console.log('PASS: single-crochet motion has five connected, finite 3D phases.');
// Single-crochet phase controls settle at the end pose without changing learner progress.
const singleEnv=makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(5)',singleEnv.sandbox);
assert.equal(singleEnv.el('viewerPlaybackControls').hidden,false);
assert.equal(singleEnv.el('viewerPlayButton').textContent,'▶');
const singleBefore=JSON.stringify(singleEnv.sandbox.window.crochetLab.getState());
for(const [i,loops] of [1,1,2,2,1].entries()){
  vm.runInContext(`seekPhase(${i})`,singleEnv.sandbox);
  assert.match(singleEnv.el('singleGuide').textContent,new RegExp('\\b'+loops+' loop'));
}
singleEnv.el('viewerTimeline').value='1000';
singleEnv.callUI('viewerTimeline','input');
assert.equal(singleEnv.el('viewerTimeline').value,'1000');
assert.match(singleEnv.el('singleGuide').textContent,/1 loop/);
assert.equal(JSON.stringify(singleEnv.sandbox.window.crochetLab.getState()),singleBefore);
console.log('PASS: single-crochet settled phases expose loop guidance without changing progress.');
// Lesson-specific recovery choices give actionable guidance without changing counts or completion.
const troubleEnv=makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(5)',troubleEnv.sandbox);
const troubleBefore=troubleEnv.sandbox.window.crochetLab.getState();
for(const [id,pattern] of [['troubleTight',/loosen/i],['troubleFind',/loop on your hook/i],['troubleExtra',/undo/i],['troubleDropped',/reinsert/i]]){
  troubleEnv.callUI(id,'click');
  assert.match(troubleEnv.el('reviewFeedback').textContent,pattern);
}
const troubleAfter=troubleEnv.sandbox.window.crochetLab.getState();
for(const key of ['chains','singles','row','rowStitches'])assert.equal(troubleAfter[key],troubleBefore[key]);
assert.deepEqual(troubleAfter.done,troubleBefore.done);
vm.runInContext('changeStep(6)',troubleEnv.sandbox);
assert.equal(troubleEnv.el('reviewFeedback').textContent,'');
console.log('PASS: single-crochet recovery guidance is actionable and never changes progress.');

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

// Handedness is viewer memory: mirrored practice swaps the strand drawing only,
// survives scene changes, and never touches counters or the journal.
const handEnv=makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(1)',handEnv.sandbox);
assert.equal(handEnv.el('viewerHandedness').hidden,false);
assert.equal(handEnv.el('viewerHandedness').value,'right');
handEnv.el('viewerHandedness').value='left';
handEnv.callUI('viewerHandedness','input');
assert.equal(handEnv.el('viewerHandedness').value,'left');
vm.runInContext('changeStep(4)',handEnv.sandbox);
assert.equal(handEnv.el('viewerHandedness').value,'left');
assert.equal(handEnv.storedChains(),0);
assert.deepEqual(handEnv.storedEvents(),[]);
vm.runInContext('changeStep(2)',handEnv.sandbox);
assert.equal(handEnv.el('viewerPlaybackControls').hidden,true);
console.log('PASS: handedness mirrors the model, persists across scenes, never counts.');

// Switching handedness mid-phase leaves the playhead copy and stored state untouched.
const mirrorEnv=makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(3)',mirrorEnv.sandbox);
mirrorEnv.el('viewerTimeline').value='500';
mirrorEnv.callUI('viewerTimeline','input');
const phaseText=mirrorEnv.el('viewerPhaseText').textContent;
const chainsBefore=mirrorEnv.storedChains();
const eventsBefore=mirrorEnv.storedEvents();
for(const value of ['left','right','left']){
  mirrorEnv.el('viewerHandedness').value=value;
  mirrorEnv.callUI('viewerHandedness','input');
  assert.equal(mirrorEnv.el('viewerPhaseText').textContent,phaseText);
  assert.equal(mirrorEnv.storedChains(),chainsBefore);
  assert.deepEqual(mirrorEnv.storedEvents(),eventsBefore);
}
assert.equal(mirrorEnv.el('viewerHandedness').value,'left');
console.log('PASS: handedness swaps do not disturb playback or persisted counts.');

console.log('PASS: knot/chain playback regression suite.');

// Phase copy must never be cut off. Browser measurement at 750–800 px and 1024 px showed
// clientWidth 179–228 px against 246 px of text while the label held a 150 px flex basis
// beside three selects, so "Tighten the sliding knot" ended in an ellipsis.
const styles=fs.readFileSync(__dirname+'/../styles.css','utf8');
const phaseRules=[...styles.matchAll(/([^{}]*#viewerPhaseText[^{}]*)\{([^}]*)\}/g)].map(m=>({selector:m[1],body:m[2]}));
assert.ok(phaseRules.length,'the phase label has a style rule');
for(const rule of phaseRules){
  assert.doesNotMatch(rule.body,/text-overflow\s*:\s*ellipsis/,'phase copy is never ellipsized');
  assert.doesNotMatch(rule.body,/white-space\s*:\s*nowrap/,'phase copy may wrap instead of clipping');
  const flex=rule.body.match(/flex\s*:\s*([^;}]+)/);
  if(flex) assert.match(flex[1].trim(),/^1\s+1\s+100%$/,'the phase label claims a full row at every width');
}
console.log('PASS: phase label keeps a full row and is never ellipsized.');

// The slider's maximum is reachable. Before this check, seeking to 1000 parked the playhead
// at the 6000 ms timeline end but reported 882/1000, so the thumb visibly snapped backwards.
const maxEnv=makeTestEnv({reducedMotion:true});
vm.runInContext('changeStep(1)',maxEnv.sandbox);
maxEnv.el('viewerTimeline').value='1000';
maxEnv.callUI('viewerTimeline','input');
assert.equal(maxEnv.el('viewerTimeline').value,'1000');
assert.equal(maxEnv.el('viewerPhaseText').textContent,'Phase 5 of 5 · Tighten the sliding knot');
// Phase boundaries stay evenly spaced across the full slider travel.
for(const [value,expected] of [['0','Phase 1 of 5 · Lay yarn'],['250','Phase 2 of 5 · Cross to form a loop'],['500','Phase 3 of 5 · Pull a bight through'],['750','Phase 4 of 5 · Place loop on hook']]){
  maxEnv.el('viewerTimeline').value=value;
  maxEnv.callUI('viewerTimeline','input');
  assert.equal(maxEnv.el('viewerPhaseText').textContent,expected);
}
console.log('PASS: slider maximum settles on the final frame without snapping back.');

// The timeline repeats. Holding the settled final frame must end, or playback stalls forever
// at the last pose because the clamped playhead can never reach the hold deadline again.
const repeatEnv=makeTestEnv();
vm.runInContext('changeStep(1)',repeatEnv.sandbox);
const t0=repeatEnv.runTicks(0,1);
repeatEnv.el('viewerTimeline').value='1000';
repeatEnv.callUI('viewerTimeline','input');
repeatEnv.callUI('viewerPlayButton','click'); // play from the settled end restarts at zero
assert.equal(repeatEnv.el('viewerTimeline').value,'0');
repeatEnv.el('viewerTimeline').value='990'; // 5940 ms, inside the last phase
repeatEnv.callUI('viewerTimeline','input');
repeatEnv.callUI('viewerPlayButton','click');
const t1=repeatEnv.runTicks(t0,5); // 160 ms reaches the settled end
assert.equal(repeatEnv.el('viewerTimeline').value,'1000','the settled final frame is held');
repeatEnv.runTicks(t1,30); // 960 ms more crosses the 6.8 s loop deadline
assert.ok(Number(repeatEnv.el('viewerTimeline').value)<900,'the timeline repeats after the settled hold');
assert.equal(repeatEnv.storedChains(),0);
console.log('PASS: playback holds the settled frame, then repeats instead of stalling.');

// Yarn loops must stay continuous where they cross the hook. Painting metal last used to
// sever both loop legs at motion 0 ms; the hook belongs underneath the strands.
const layerEnv=makeTestEnv({reducedMotion:true});
const strokeColors=[];
const recordingTarget={
  createLinearGradient(){return {addColorStop(){}};},
  createRadialGradient(){return {addColorStop(){}};},
  stroke(){strokeColors.push(recordingTarget.strokeStyle);}
};
const recordingCtx=new Proxy(recordingTarget,{get(t,k){return k in t?t[k]:(()=>{});}});
layerEnv.sandbox.recordingCtx=recordingCtx;
vm.runInContext(`window.StitchRenderer.render(recordingCtx,{
  motion:window.StitchMotion.CHAIN_MOTION,playheadMs:0,yaw:-.23,pitch:.13,zoom:1,
  mirror:false,completedCount:0,width:620,height:385,dpr:1
})`,layerEnv.sandbox);
const metalIndex=strokeColors.indexOf('#c9ddf5');
const activeYarnIndex=strokeColors.indexOf('#ffc8d0');
assert.ok(metalIndex>=0&&activeYarnIndex>=0,'the frame contains both hook and active-yarn strokes');
assert.ok(metalIndex<activeYarnIndex,'the hook is painted before the yarn loop, not over it');
console.log('PASS: hook is painted before yarn so loops remain continuous.');
