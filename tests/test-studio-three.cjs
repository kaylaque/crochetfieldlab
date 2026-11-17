const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const c={window:{},console,AbortController};vm.runInNewContext(fs.readFileSync('dist/studio-three.js','utf8'),c);const T=c.window.StudioThree;
const front=T.projectPoint([1,2,3],{mode:'front',width:600,height:380,zoom:1,panX:0,panY:0}),side=T.projectPoint([1,2,3],{mode:'side',width:600,height:380,zoom:1,panX:0,panY:0});
assert.ok(Math.abs(front[0]-383.6)<1e-9&&Math.abs(front[1]-41.8)<1e-9);
assert.ok(Math.abs(side[0]-550.8)<1e-9&&Math.abs(side[1]-41.8)<1e-9);
const pose={position:[0,0,0],orientation:[0,0,0],joints:{thumb:[0,0],index:[0,0],middle:[0,0],ring:[0,0],pinky:[0,0]}};
assert.equal(T.handSegments(pose).length,16);assert.ok(T.handSegments(pose).every(s=>s.length===2&&s.every(p=>p.every(Number.isFinite))));
console.log('PASS: renderer projection and deterministic hand rig adapter.');
