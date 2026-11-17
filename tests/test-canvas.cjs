const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('stitch-canvas.js', 'utf8'), context);
const canvas = context.window.StitchCanvas;
const frame = { regions: { hookContact: { id:'hookContact',active:true,points:[[0,0,0],[.3,0,0],[.6,0,0],[.9,.23,.4],[1,0,0]] } }, hook:{position:[0,0,0],orientation:[0,0,0],scale:1} };
const layout = canvas.layoutFrame(frame,{mode:'front',zoom:1,panX:0,panY:0,mirror:false,selected:null,width:400,height:300,dpr:1});
assert.ok(layout.hook);
assert.ok(layout.handles.some(handle => handle.regionId === 'hookContact'));
assert.equal(layout.foundation.length, 7);
assert.ok(layout.hook.throat);
assert.equal(layout.hook.path.length, 2);
const tilted = { ...frame, hook:{position:[1.3,0,.2],orientation:[.4,0,0],scale:1} };
const side = canvas.layoutFrame(tilted,{mode:'side',zoom:1,panX:0,panY:0,mirror:false,selected:null,width:400,height:300,dpr:1});
const expectedDepth = .2 + .9*Math.cos(.4) - .23*Math.sin(.4);
assert.ok(Math.abs(side.hook.throat.x-side.project([0,0,expectedDepth])[0]) < 1e-8,
  'side-view throat follows hook depth and pitch, not front-view x');
const strokes=[];
const ctx={
  clearRect(){},fillRect(){},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},
  arc(){},fill(){},stroke(){strokes.push(this.strokeStyle);}
};
canvas.drawScene(ctx,frame,{mode:'front',zoom:1,panX:0,panY:0,mirror:false,selected:null,width:400,height:300,dpr:1});
assert.ok(strokes.lastIndexOf('#c9ddf5') < strokes.lastIndexOf('#ec9cad'),
  'yarn loops must paint over the hook shaft so both loops stay legible');
const labels=[];
ctx.fillText=(text,x,y)=>labels.push({text,x,y});
const twoLoops={...frame,regions:{...frame.regions,firstLoop:{id:'firstLoop',active:true,points:Array.from({length:12},(_,i)=>[i*.04,-.1,0])},newLoop:{id:'newLoop',active:true,points:Array.from({length:12},(_,i)=>[.7+i*.04,-.1,.2])},workingYarn:{id:'workingYarn',active:true,points:[[0,0,0],[.3,.1,0],[.6,.2,0],[1,.3,0],[1.4,.4,0],[1.8,.5,0]]}}};
canvas.drawScene(ctx,twoLoops,{mode:'front',zoom:1,panX:0,panY:0,mirror:false,selected:null,width:400,height:300,dpr:1});
assert.ok(labels.some(l=>l.text==='Second chain V')&&labels.some(l=>l.text==='Working yarn'),
  'an untrained viewer needs the insertion target and yarn supply identified');
assert.ok(labels.some(l=>l.text==='Loop 1')&&labels.some(l=>l.text==='Loop 2'),
  'two seated loops need separate visible labels at the pull-up checkpoint');
const phone=canvas.layoutFrame(frame,{mode:'front',zoom:1,panX:0,panY:0,mirror:false,selected:null,width:304,height:280,dpr:2});
assert.ok(phone.project([3,.62,0])[0] < 292,
  'working-yarn supply must remain inside a narrow front canvas');
const sceneContext={window:{}};
vm.runInNewContext(fs.readFileSync('stitch-scene.js','utf8'),sceneContext);
const pullUp=sceneContext.window.StitchScene.SINGLE_CROCHET.checkpoints[3];
for(const mode of ['front','side']){
  const boxes=[];
  const captionCtx={...ctx,fillRect(x,y,width,height){boxes.push({x,y,width,height});}};
  canvas.drawScene(captionCtx,pullUp,{mode,width:288,height:280,zoom:1,mirror:false});
  for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];
    assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y,
      `${mode} captions ${i} and ${j} overlap at 320px`);
  }
}
