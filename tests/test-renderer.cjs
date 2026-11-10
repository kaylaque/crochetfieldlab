const assert=require('assert'),fs=require('fs'),vm=require('vm');
const calls=[],strokes=[];
let path=[],style='';
const gradient={addColorStop(){}};
const ctx=new Proxy({createLinearGradient(){return gradient},createRadialGradient(){return gradient},beginPath(){calls.push('begin');path=[]},moveTo(x,y){calls.push('move');path.push([x,y])},lineTo(x,y){calls.push('line');path.push([x,y])},stroke(){calls.push('stroke');strokes.push({style,points:path.slice()})},fillText(t){calls.push(['text',t])},save(){},restore(){},translate(){},clearRect(){},fillRect(){},arc(){},fill(){},ellipse(){},roundRect(){}},{set(o,k,v){o[k]=v;if(k==='strokeStyle')style=v;return true}});
const sandbox={window:{}};vm.createContext(sandbox);
for(const f of ['stitch-motion.js','stitch-renderer.js'])vm.runInContext(fs.readFileSync(f,'utf8'),sandbox);
const base={motion:sandbox.window.StitchMotion.CHAIN_MOTION,playheadMs:6000,yaw:-.23,pitch:.13,zoom:1,mirror:false,width:620,height:385,dpr:1};
const YARN=new Set(['#ec9cad','#ffc8d0','#b987a6']);
function draw(extra){
  strokes.length=0;
  const result=sandbox.window.StitchRenderer.render(ctx,{...base,...extra});
  return {result,snapshot:strokes.map(s=>({style:s.style,points:s.points.map(p=>[...p])}))};
}
function assertInBuffer(label,snapshot){
  assert.ok(snapshot.length>0,`${label}: expected stroked geometry`);
  for(const {points} of snapshot)for(const [x,y] of points){
    assert.ok(Number.isFinite(x)&&Number.isFinite(y),`${label}: non-finite geometry ${x},${y}`);
    assert.ok(x>=0&&x<=base.width&&y>=0&&y<=base.height,`${label}: geometry outside ${base.width}x${base.height} buffer at ${x},${y}`);
  }
}
const yarnPoints=snapshot=>snapshot.filter(s=>YARN.has(s.style)).flatMap(s=>s.points);
const span=(values)=>Math.max(...values)-Math.min(...values);

let run=draw({completedCount:0});
assert.equal(run.result.visibleCompletedVs,0);
assertInBuffer('chain end',run.snapshot);
const plainYarn=yarnPoints(run.snapshot);
assert.ok(plainYarn.length>=8,`expected yarn passes to draw geometry, got ${plainYarn.length} points`);
assert.ok(run.snapshot.some(s=>s.style==='#3b3355'),'ink outline must be stroked');
assert.ok(run.snapshot.some(s=>s.style==='#b987a6'),'underside pass must be stroked');
assert.ok(run.snapshot.some(s=>s.style.startsWith('rgba(255,255,255')),'highlight pass must be stroked');
assert.ok(span(plainYarn.map(p=>p[0]))>60,`yarn must span a visible width, got ${span(plainYarn.map(p=>p[0]))}px`);
assert.ok(span(plainYarn.map(p=>p[1]))>20,`yarn must span a visible height, got ${span(plainYarn.map(p=>p[1]))}px`);

run=draw({completedCount:11});
assert.equal(run.result.visibleCompletedVs,11);
assertInBuffer('11 completed Vs',run.snapshot);
const eleven=run.snapshot;

run=draw({completedCount:17});
assert.equal(run.result.visibleCompletedVs,11);
assertInBuffer('overflow label',run.snapshot);
assert.ok(calls.some(c=>Array.isArray(c)&&c[0]==='text'&&c[1]==='Last 11 of 17 counted'));

const mirrored=draw({completedCount:0,mirror:true});
assert.equal(mirrored.result.visibleCompletedVs,0);
assertInBuffer('mirrored',mirrored.snapshot);
const plain=draw({completedCount:0,mirror:false});
assert.deepEqual(mirrored.snapshot.map(s=>s.points.length),plain.snapshot.map(s=>s.points.length),'mirroring must not add or drop geometry');
assert.notDeepEqual(mirrored.snapshot,plain.snapshot,'mirrored geometry must differ from unmirrored geometry');
assert.notDeepEqual(yarnPoints(mirrored.snapshot),plainYarn,'mirrored yarn geometry must differ from unmirrored yarn');

// The hook's local shape is asymmetric (handle at negative local x, curl at positive),
// so a true mirror must reflect that local x before rotation. Rotating the unreflected
// shape instead leaves the handle and curl on their original sides and only flips the
// throat. At yaw=0/pitch=0 projection is a symmetric x scale, so a genuinely reflected
// hook is exactly the right-handed hook reflected about the canvas centre.
const metalHook=snapshot=>snapshot.filter(s=>s.style==='#c9ddf5').map(s=>s.points);
const flatRight=draw({completedCount:0,yaw:0,pitch:0,mirror:false});
const flatLeft=draw({completedCount:0,yaw:0,pitch:0,mirror:true});
const rightHook=metalHook(flatRight.snapshot),leftHook=metalHook(flatLeft.snapshot);
assert.equal(leftHook.length,rightHook.length,'mirroring must not add or drop hook strokes');
assert.ok(rightHook.length>=2,`expected hook shaft and tip strokes, got ${rightHook.length}`);
assertInBuffer('flat right hook',flatRight.snapshot);
assertInBuffer('flat left hook',flatLeft.snapshot);
let hookDeviation=0;
for(let i=0;i<rightHook.length;i++){
  assert.equal(leftHook[i].length,rightHook[i].length,'mirroring must not resample hook strokes');
  for(let j=0;j<rightHook[i].length;j++){
    const [x,y]=rightHook[i][j],[mx,my]=leftHook[i][j];
    hookDeviation=Math.max(hookDeviation,Math.abs(mx-(base.width-x)),Math.abs(my-y));
  }
}
assert.ok(hookDeviation<1e-6,`mirrored hook must be a true reflection of the right-handed hook, worst deviation ${hookDeviation.toFixed(3)}px (handle/curl still on their original sides?)`);

const zoomed=draw({completedCount:0,zoom:1.6});
assertInBuffer('zoomed',zoomed.snapshot);
assert.notDeepEqual(yarnPoints(zoomed.snapshot),plainYarn,'zoom must affect yarn geometry');

const tightened=draw({completedCount:0,playheadMs:0});
assert.notDeepEqual(yarnPoints(tightened.snapshot),plainYarn,'playhead must affect yarn geometry');
assert.ok(eleven.length>plain.snapshot.length,'completed Vs must add stroke geometry');
console.log('PASS: completed Vs, overflow label, projected in-buffer yarn, mirroring, reflected hook, zoom.');
