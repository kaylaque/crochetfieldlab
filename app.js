/* Crochet Field Lab • static, privacy-first prototype • US crochet terms */
const $ = (id) => document.getElementById(id);
const VIDEO = 'https://www.youtube.com/watch?v=aAxGTnVNJiE';
const STORE = 'crochet-field-lab-progress-v1';
const LESSONS = [
  { title:'Meet your tools.', short:'Materials & setup', phase:'PREPARE', time:23, scene:'materials', description:'Start with medium-weight yarn, a matching crochet hook, scissors, and a yarn needle.', move:'Find your hook and yarn. Make room for both hands in front of you.', hint:'Lighter yarn makes each loop easier to see.', tip:'Try a smooth, light-colored yarn and an appropriately sized hook. You can practice without buying a special kit.' },
  { title:'Make a slip knot.', short:'A little slip knot', phase:'START', time:53, scene:'knot', description:'This adjustable loop goes onto the hook. It is your starting point—not a crochet stitch.', move:'Make a yarn loop, pull a bight through it, then place the new loop on the hook.', hint:'Tighten just enough for the loop to slide freely.', tip:'If your knot gets stuck, loosen the working yarn. The loop should glide on your hook.' },
  { title:'Find your comfy grip.', short:'Hold hook & yarn', phase:'HOLD', time:75, scene:'grip', description:'Hold the hook like a pencil or knife. Let the other hand guide the working yarn.', move:'Rest your fingers on the flat grip and keep a little tension in the working yarn.', hint:'A relaxed grip is better than gripping tightly.', tip:'There is no single perfect grip. Aim for an even tension and comfortable wrists.' },
  { title:'Yarn over. Pull through.', short:'The chain movement', phase:'LEARN THE MOTION', time:112, scene:'motion', description:'This repeated motion creates the foundation chain.', move:'Wrap working yarn over the hook, then draw it through the loop already on the hook.', hint:'You should finish with exactly one loop on your hook.', tip:'If the hook catches the yarn, rotate its tip downward as you pull through.' },
  { title:'Build your first chain.', short:'Make 11 chains', phase:'FOUNDATION', time:112, scene:'chain', description:'Practice 11 chain stitches (ch). Count the V shapes; do not count the loop on your hook.', move:'Make a chain. Tap + Stitch every time you pull a new loop through.', hint:'Target: 11 chains. The loop currently on your hook does not count.', counter:'chains', target:11, tip:'Keep your foundation chain loose enough to insert your hook later. The slip knot is not a chain stitch.' },
  { title:'Learn single crochet.', short:'First single crochet', phase:'STITCH', time:215, scene:'single', description:'Insert the hook into the second chain from your hook, yarn over and pull up a loop, then yarn over and pull through both loops.', move:'Complete one single crochet (sc) and inspect the two loops before the final pull-through.', hint:'The chain on your hook is not counted. Start in the second V from the hook.', counter:'single', target:10, tip:'US terms: single crochet = sc. Two loops are on the hook halfway through a single crochet; one remains at the end.' },
  { title:'Grow a tiny swatch.', short:'Repeat & turn rows', phase:'PRACTICE', time:215, scene:'swatch', description:'Continue single crochet across 10 stitches. Chain one and turn before the next row.', move:'Count your single crochets. When a row has 10 stitches, use + Next row to turn and continue.', hint:'Each row in this practice swatch targets 10 single crochets.', counter:'single', target:10, tip:'At the end of a row, chain one for turning, then work into the first stitch of the next row. Turning-chain rules vary by pattern.' },
  { title:'Finish your masterpiece.', short:'Fasten off & weave', phase:'FINISH', time:422, scene:'finish', description:'Cut the yarn with a tail, pull it through your last loop, then weave the tail through the fabric.', move:'Fasten off securely and use a blunt yarn needle to hide the tail inside a few stitches.', hint:'Your small swatch is the beginning of bigger projects.', tip:'Weave your yarn tail in multiple directions for a more secure finish. Double crochet comes in a later lesson.' }
];
const blank = () => ({step:0,done:[],chains:0,singles:0,row:1,rowStitches:0,events:[],lastSaved:null,paused:false});
function load(){try{const data=JSON.parse(localStorage.getItem(STORE)||'null');if(!data || typeof data!=='object') return blank();return {...blank(),...data,step:Math.max(0,Math.min(LESSONS.length-1,Number(data.step)||0)),done:Array.isArray(data.done)?data.done.filter(x=>Number.isInteger(x)&&x>=0&&x<LESSONS.length):[],events:Array.isArray(data.events)?data.events.slice(0,180):[]};}catch{return blank();}}
let state=load();let view='learn';let cameraStream=null;let handLandmarker=null;let tracking=false;let trackingTimer=null;let facing='environment';let lastVideoTime=-1;
let modelPlaying=!matchMedia('(prefers-reduced-motion: reduce)').matches;
// Viewer-local lesson playback speed; never persisted.
let speed=1;
const two=n=>String(n).padStart(2,'0');
function persist(){state.lastSaved=new Date().toISOString();try{localStorage.setItem(STORE,JSON.stringify(state));$('saveStatus').textContent='Saved on this device';}catch{$('saveStatus').textContent='Could not save: storage unavailable';}}
function eventLog(title,detail=''){state.events.unshift({title,detail,at:new Date().toISOString()});state.events=state.events.slice(0,180);persist();}
function on(id,evt,handler){$(id).addEventListener(evt,handler);}
function changeStep(i){state.step=Math.max(0,Math.min(LESSONS.length-1,i));state.paused=false;persist();render();}
function markNext(){const i=state.step;if(!state.done.includes(i)){state.done.push(i);eventLog('Lesson completed',`${two(i+1)} · ${LESSONS[i].short}`);}if(i<LESSONS.length-1){changeStep(i+1);}else{persist();render();setView('journal');}}
function stepList(){const list=$('stepList');list.replaceChildren();LESSONS.forEach((s,i)=>{const li=document.createElement('li');const btn=document.createElement('button');btn.type='button';btn.className='step-item'+(i===state.step?' active':'');btn.setAttribute('aria-current',i===state.step?'step':'false');const no=document.createElement('span');no.className='step-number';no.textContent=state.done.includes(i)?'✓':two(i+1);const info=document.createElement('span');info.className='step-info';const name=document.createElement('span');name.className='step-name';name.textContent=s.short;const subtitle=document.createElement('small');subtitle.className='step-subtitle';subtitle.textContent=s.phase;info.append(name,subtitle);btn.append(no,info);btn.addEventListener('click',()=>changeStep(i));li.append(btn);list.append(li);});}
function render(){const s=LESSONS[state.step];$('ribbonProgressLabel').textContent=`${two(state.step+1)} / ${two(LESSONS.length)}`;$('percentLabel').textContent=`${Math.round(state.done.length/LESSONS.length*100)}% completed`;$('courseProgress').setAttribute('aria-valuenow',String(Math.round(state.done.length/LESSONS.length*100)));$('progressFill').style.width=`${state.done.length/LESSONS.length*100}%`;$('stepCompletedText').textContent=`${state.done.length}/${LESSONS.length} DONE`;
$('stepEyebrow').textContent=`STEP ${two(state.step+1)} / ${two(LESSONS.length)} · ${s.phase}`;$('stepTitle').textContent=s.title;$('stepDescription').textContent=s.description;$('chapterNumber').textContent=two(state.step+1);$('instructionText').textContent=s.move;$('instructionHint').textContent=s.hint;$('modelLabel').textContent=({materials:'YARN + HOOK',knot:'ADJUSTABLE LOOP',grip:'THE COMFORT GRIP',motion:'YARN OVER + PULL THROUGH',chain:'FOUNDATION CHAIN',single:'SINGLE CROCHET',swatch:'ROW BY ROW',finish:'FASTEN OFF'})[s.scene];$('videoLink').href=VIDEO+`&t=${s.time}s`;
$('countingPanel').hidden=!s.counter;$('rowControl').hidden=s.counter!=='single';
if(s.counter){const chains=s.counter==='chains';$('counterHeading').textContent=chains?'FOUNDATION CHAIN • CH':'SINGLE CROCHET • SC';$('countValue').textContent=String(chains?state.chains:state.rowStitches);$('countTarget').textContent=String(s.target);$('rowIndicator').textContent=chains?`${state.chains} chains total · counted by you`:`Row ${state.row} · ${state.singles} single crochets total`;$('decrementCount').disabled=chains?state.chains<=0:state.rowStitches<=0;$('newRow').hidden=chains;$('newRow').disabled=state.rowStitches===0;}
$('previousButton').disabled=state.step===0;$('nextButton').textContent=state.step===LESSONS.length-1?'Finish & view journal →':state.done.includes(state.step)?'Continue to next →':'Mark done & continue →';$('progressPrompt').textContent=state.done.includes(state.step)?'You finished this lesson ✓':'Make a little progress at a time ♡';stepList();renderJournal();updateScene();}
function count(delta){const s=LESSONS[state.step];if(!s.counter)return;if(s.counter==='chains'){state.chains=Math.max(0,state.chains+delta);eventLog(delta>0?'Chain added':'Chain corrected',`${state.chains} foundation chains`);}else{if(delta<0&&state.rowStitches===0)return;state.rowStitches=Math.max(0,state.rowStitches+delta);state.singles=Math.max(0,state.singles+delta);eventLog(delta>0?'Single crochet added':'Stitch corrected',`Row ${state.row}: ${state.rowStitches} stitches · ${state.singles} total`);}persist();render();}
function nextRow(){if(state.rowStitches===0)return;eventLog('Row finished',`Row ${state.row} · ${state.rowStitches} single crochet stitches`);state.row++;state.rowStitches=0;persist();render();}
function renderJournal(){$('journalCompleted').textContent=`${state.done.length} / ${LESSONS.length}`;$('journalChains').textContent=String(state.chains);$('journalSingles').textContent=String(state.singles);$('journalPlace').textContent=two(state.step+1);$('journalPlaceDetail').textContent=LESSONS[state.step].short;
const history=$('historyList');history.replaceChildren();if(!state.events.length){const empty=document.createElement('div');empty.className='history-empty';empty.textContent='Your next stitch will become your first journal entry.';history.append(empty);}else{state.events.slice(0,80).forEach(e=>{const item=document.createElement('div');item.className='history-entry';const copy=document.createElement('div');const strong=document.createElement('strong');strong.textContent=e.title;const d=document.createElement('small');d.textContent=e.detail;copy.append(strong,d);const t=document.createElement('time');t.dateTime=e.at;t.textContent=new Date(e.at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});item.append(copy,t);history.append(item);});}}
function setView(next){view=next;const journal=next==='journal';$('learnView').hidden=journal;$('journalView').hidden=!journal;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===next));if(journal){renderJournal();stopCamera();}else{render();}scrollTo({top:0,behavior:'smooth'});}
function modal(id,open){$(id).hidden=!open;document.body.style.overflow=open?'hidden':'';}
function pause(){state.paused=true;eventLog('Session paused',`Step ${state.step+1}: ${LESSONS[state.step].short}`);stopCamera();$('pauseSnapshot').textContent=`CURRENT STEP ${two(state.step+1)} · ${LESSONS[state.step].short}\n${state.chains} chains · ${state.singles} single crochets · row ${state.row}`;modal('pauseOverlay',true);}
function resume(){state.paused=false;eventLog('Session resumed',`Step ${state.step+1}: ${LESSONS[state.step].short}`);modal('pauseOverlay',false);setView('learn');}
// 3D illustrations use animated 3D curves projected into Canvas 2D. These are explanatory, not stitch-physics simulations.
const canvas=$('stitchCanvas'),g=canvas.getContext('2d');let yaw=-0.23,pitch=0.13,zoom=1,dragging=false,lastPointer=null,processProgress=0,lastFrame=0,activeScene='';const pointers=new Map();let pinchDistance=0;
const C={outline:'#3b3355',pink:'#ec9cad',pinkLight:'#ffc8d0',metal:'#c9ddf5',metalHighlight:'#f1f7ff'};
const REDUCED_MOTION=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TIMELINE_MS=6000,TIMELINE_HOLD_MS=800,TIMELINE_TOTAL_MS=6800;
const KNOT_PHASES=['Lay yarn','Cross to form a loop','Pull a bight through','Place loop on hook','Tighten the sliding knot'];
const CHAIN_PHASES=['One loop on hook','Yarn over','Pull through','New chain V'];
const ANIMATED_SCENES={knot:KNOT_PHASES,motion:CHAIN_PHASES,chain:CHAIN_PHASES};
const ANGLE_PRESETS={front:[-0.23,0.13],top:[-0.23,-0.8],side:[Math.PI/2,0.13]};
function P(x,y,z=0){return [x,y,z];}
function transform(p){const [x,y,z]=p;const ax=x*Math.cos(yaw)-z*Math.sin(yaw),az=x*Math.sin(yaw)+z*Math.cos(yaw);const by=y*Math.cos(pitch)-az*Math.sin(pitch),bz=y*Math.sin(pitch)+az*Math.cos(pitch);return [ax,by,bz];}
function proj(p){const [x,y,z]=transform(p),dist=8;const f=dist/(dist+z*0.18);const u=canvas.width/2+x*canvas.height*0.18*zoom*f,v=canvas.height*.51-y*canvas.height*.18*zoom*f;return [u,v];}
function tube(points,color=C.pink,width=16,alpha=1){if(points.length<2)return;let q=points.map(proj);g.save();g.globalAlpha=alpha;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(...q[0]);for(let i=1;i<q.length;i++)g.lineTo(...q[i]);const stroke=width*canvas.height/420*zoom;g.lineWidth=stroke+Math.max(2.8,stroke*.24);g.strokeStyle=C.outline;g.stroke();g.lineWidth=stroke;g.strokeStyle=color;g.stroke();g.globalAlpha=alpha*.75;g.lineWidth=Math.max(1.4,stroke*.16);g.strokeStyle='rgba(255,255,255,.75)';g.translate(0,-stroke*.15);g.stroke();g.restore();}
function curve(fn,n=50){return Array.from({length:n+1},(_,i)=>fn(i/n));}
function ellipse(cx,cy,rx,ry,z=0,angle=0){return curve(t=>{const a=t*Math.PI*2;let x=rx*Math.cos(a),y=ry*Math.sin(a);return P(cx+x*Math.cos(angle)-y*Math.sin(angle),cy+x*Math.sin(angle)+y*Math.cos(angle),z+Math.sin(a*2)*.1);},76);}
function yarnBall(x,y,z,r=0.8){const sph=ellipse(x,y,r,r*.88,z);tube(sph,C.pinkLight,49*r,1);for(let j=0;j<9;j++){const a=-1.1+j*.33;const stroke=curve(t=>{const v=(t-.5)*2;return P(x+r*.85*v*Math.cos(a),y+r*.65*v*Math.sin(a)+.18*Math.sin(5*t+j),z-.2+.13*Math.cos(4*t+j));},30);tube(stroke,j%2?C.pink:C.pinkLight,3.6,0.84);}}
function hook(x,y,s=1,angle=-.15){const tail=curve(t=>{let xx=x+(-1.7+2.6*t)*s,yy=y+(.12+(t*.12))*s;return P(xx*Math.cos(angle)-yy*Math.sin(angle),xx*Math.sin(angle)+yy*Math.cos(angle),.4);},36);tube(tail,C.metal,24*s);const tip=P((x+.9*s)*Math.cos(angle)-(y+.23*s)*Math.sin(angle),(x+.9*s)*Math.sin(angle)+(y+.23*s)*Math.cos(angle),.4);const hooktip=curve(t=>P(tip[0]+(.11*Math.sin(Math.PI*t)+.20*t)*s,tip[1]+(.25*Math.sin(Math.PI*t)-.19*t)*s,.4),25);tube(hooktip,C.metalHighlight,13*s);}
function chains(n=7,y=-.2){for(let i=0;i<n;i++){const x=(i-(n-1)/2)*.52;const r=ellipse(x,y+(i%2)*.1,.35,.23,.1+(i%2)*.12,i%2?.3:-.3);tube(r,i%2?C.pinkLight:C.pink,15);}}
function drawChainV(x,y,i=0,n=2){const angle=i%2?.3:-.3;const z=.1+(i%2)*.12;const first=curve(q=>P(x-.2+q*.2,y-.14+q*.26,z+.04*Math.sin(q*6)),18);tube(first,i%2?C.pinkLight:C.pink,15);const second=curve(q=>P(x+.0+q*.2,y+.12-q*.26,z+.05),18);tube(second,i%2?C.pink:C.pinkLight,15);}
// Ordered knot process: default front-left yarn; working strand crosses, extends a bight through the loop, loop tightens around the bight on the hook.
function drawKnotProcess(progress){
  const normalized=Math.max(0,Math.min(1,progress/TIMELINE_MS));
  const stages=5;
  const span=normalized*stages;
  const stage=Math.max(0,Math.min(stages,Math.floor(span)));
  const frac=Math.max(0,Math.min(1,span-stage));
  const eased=e=>1-Math.cos(Math.PI*.5*e);
  // relative movement parameters
  let crossZ=0,loopScale=0,bightY=0,slideX=0;
  if(stage===0){crossZ=0;loopScale=0;bightY=0;}
  else if(stage===1){crossZ=eased(frac);loopScale=.68*eased(frac);bightY=0;}
  else if(stage===2){crossZ=1;loopScale=.68;bightY=.56*eased(frac);}
  else if(stage===3){crossZ=1;loopScale=.68;bightY=.56;}
  if(stage===4){crossZ=1;loopScale=.68;bightY=.56;slideX=eased(frac)*.32;}
  else if(stage===5){crossZ=1;loopScale=.68;bightY=.56;slideX=.32;}
  const xShift=slideX;
  // Tail strand stays on the left, working strand on the right.
  const tail=curve(q=>P(-2.15+q*.8,-.62+q*.66,.08),40);
  tube(tail,C.pink,18);
  const workRight=curve(q=>P(-.06+q*.62,-.1+q*.36,.07+crossZ*.16),40);
  tube(workRight,C.pinkLight,18);
  // The crossed first loop tightens as the bight is pulled through; the working strand crosses above the tail.
  if(loopScale>0){
    const loop=ellipse(-.56+xShift,-.05+xShift*.2,.62*loopScale+.22,.78*loopScale+.22,.1+crossZ*.22,-crossZ*1.5);
    tube(loop,C.pinkLight,18);
  }
  // Bight rises through the loop and opens around the hook tip; tail and working strands remain distinct.
  const bightStartX=-.06+xShift, bightStartY=-.02+xShift*.2;
  const bight=curve(q=>{
    const t=frac;
    const yTop=bightY;
    return P(bightStartX+q*(.54+.28*t),bightStartY+q*(yTop*.82-0.20),.16+crossZ*.24+q*.06);
  },44);
  tube(bight,C.metal,18);
  // Working strand crossing over tail visible during the cross stage.
  if(crossZ>0){
    const cross=curve(q=>P(-1.05+q*.5,-.75+q*.18,.04+crossZ*.3),28);
    tube(cross,C.metalHighlight,18);
  }
  hook(1.14,.08,.72,.34);
}
// Ordered chain process: one loop on hook, yarn over, pull through, and one new chain V.
function drawChainProcess(progress,completedCount){
  const normalized=Math.max(0,Math.min(1,progress/TIMELINE_MS));
  const stages=4;
  const span=normalized*stages;
  const stage=Math.max(0,Math.min(stages,Math.floor(span)));
  const frac=Math.max(0,Math.min(1,span-stage));
  const eased=e=>1-Math.cos(Math.PI*.5*e);
  // One stable loop is always on the hook.
  const loop=ellipse(.09,.02,.4,.43,.11);tube(loop,C.pinkLight,17);
  // Existing chain uses actual manual counters, max 11 shown.
  const shown=Math.min(completedCount,11);
  const start=-1.35,spanX=2.65;
  for(let i=0;i<shown;i++){
    const idx=i;
    const x=shown===1?(start+spanX*.22):start+(i/(shown-1))*spanX;
    drawChainV(x,-.28,idx,shown);
  }
  // Animated next stitch is instructional only.
  const animX=Math.min(.24+frac*.34,1.15);
  //! instructional progress; does not update state.chains
  drawChainV(animX,.03,shown,shown+1);
  // Connected working strand from the previous V.
  const working=curve(q=>P(-.35+q*(animX+.35),-.42+q*.42,.05+q*.08),34);
  tube(working,C.pink,15);
  if(stage>=1){
    // Bight from the working strand rises over the hook.
    const over=curve(q=>P(animX-.02+q*.4,.08-q*.2+.02*Math.sin(q*7),.16+q*.05),36);
    tube(over,C.metal,17);
  }
  if(stage>=2){
    // New bight pulled through the old loop.
    const through=curve(q=>P(animX-.08+q*.46,-.02-q*.12,.1-q*.06),30);
    tube(through,C.pinkLight,16);
  }
  hook(1.22,.05,.62,.3);
  if(completedCount>11){
    // Famous last 11 of N; manual counting is about learning, not limits.
    const label=`Last 11 of ${completedCount} counted`;
    g.save();g.fillStyle='rgba(87,74,124,.82)';g.font=`${Math.max(11,canvas.width*.014)}px ui-monospace,monospace`;g.textAlign='left';g.fillText(label,16,92);g.restore();
  }
}
function coils(count=7,rows=2){for(let j=0;j<rows;j++)for(let i=0;i<count;i++){const x=(i-(count-1)/2)*.55,y=(j-(rows-1)/2)*.56;const e=ellipse(x,y,.38,.3,.16+(i%2)*.12,(i%2?1:-1)*.28);tube(e,(i+j)%2?C.pinkLight:C.pink,17);const v=curve(t=>P(x+.16*Math.cos(t*6),y-.2+t*.4,.31),20);tube(v,C.pink,9);}}
function drawDiagram(){if(!g)return;const w=canvas.width,h=canvas.height;g.clearRect(0,0,w,h);const grd=g.createLinearGradient(0,0,w,h);grd.addColorStop(0,'#e6ecfb');grd.addColorStop(1,'#f6e8f1');g.fillStyle=grd;g.fillRect(0,0,w,h);g.fillStyle='rgba(95,90,140,.12)';for(let x=24;x<w;x+=32)for(let y=24;y<h;y+=32){g.beginPath();g.arc(x,y,1.3,0,Math.PI*2);g.fill();}
const shad=g.createRadialGradient(w/2,h*.78,10,w/2,h*.78,h*.42);shad.addColorStop(0,'rgba(70,60,120,.14)');shad.addColorStop(1,'rgba(70,60,120,0)');g.fillStyle=shad;g.beginPath();g.ellipse(w/2,h*.78,h*.38,h*.17,0,0,Math.PI*2);g.fill();
const t=processProgress;switch(activeScene){
case 'materials':yarnBall(-1.3,-.23,-.2,.84);hook(.73,.17,.9,-.29);break;
case 'knot':drawKnotProcess(processProgress);break;
case 'grip':tube(curve(q=>P(-2.2+3.4*q,.2+Math.sin(q*3)*.3,Math.sin(q*6)*.1),60),C.pink,18);hook(.15,.15,.95,.1);tube(ellipse(-.8,.15,.42,.55,-.1),C.pinkLight,16);break;
case 'motion':drawChainProcess(processProgress,0);break;
case 'chain':drawChainProcess(processProgress,state.chains);break;
case 'single':chains(7,-1.03);tube(ellipse(-.25,-.22,.43,.62,.33),C.pinkLight,18);tube(ellipse(.08,.1,.34,.46,.44),C.pink,15);hook(.52,.5,.66,.12);break;
case 'swatch':coils(7,Math.min(4,Math.max(2,state.row)));hook(1.6,.99,.45,.09);break;
case 'finish':coils(6,3);tube(curve(q=>P(1.8-.5*q,1.1-1.5*q+.1*Math.sin(q*10),.32),36),C.pinkLight,10);hook(-.1,1.2,.52,-.38);break;
}
// soft ink annotation with motion cue
const cx=w*.75,cy=h*.78;g.save();g.fillStyle='rgba(255,251,254,.86)';g.strokeStyle='rgba(59,51,85,.25)';g.lineWidth=1.2;g.beginPath();g.roundRect(cx-52,cy-13,104,26,13);g.fill();g.stroke();g.fillStyle='#5d537a';g.textAlign='center';g.font=`${Math.max(9,w*.013)}px ui-monospace,monospace`;g.fillText('ILLUSTRATIVE 3D',cx,cy+4);g.restore();}
function resize(){const rect=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);if(rect.width&&rect.height){const W=Math.floor(rect.width*d),H=Math.floor(rect.height*d);if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}}}
function updateScene(){const next=LESSONS[state.step].scene;const animated=Boolean(ANIMATED_SCENES[next]);if(next!==activeScene){processProgress=0;modelPlaying=animated?!REDUCED_MOTION:false;}activeScene=next;$('viewerPlaybackControls').hidden=!animated;$('viewerPlayButton').hidden=!animated;$('viewerBottomTimeline').hidden=!animated;syncPlaybackUI();resize();drawDiagram();}
function currentPhaseIndex(){const labels=ANIMATED_SCENES[activeScene];if(!labels)return 0;return Math.max(0,Math.min(labels.length-1,Math.floor(processProgress/(TIMELINE_MS/labels.length))));}
function syncPlaybackUI(){const labels=ANIMATED_SCENES[activeScene];const btn=$('viewerPlayButton');btn.textContent=modelPlaying?'Ⅱ':'▶';const label=modelPlaying?'Pause process':'Play process';btn.title=label;btn.setAttribute('aria-label',label);$('viewerTimeline').value=String(Math.round(processProgress/TIMELINE_TOTAL_MS*1000));$('viewerPhaseText').textContent=labels?`Phase ${currentPhaseIndex()+1} of ${labels.length} · ${labels[currentPhaseIndex()]}`:'';}
function tick(timestamp){const now=timestamp;const canAdvance=modelPlaying&&ANIMATED_SCENES[activeScene]&&!state.paused&&view==='learn'&&!document.hidden;if(canAdvance){const raw=processProgress+Math.min(64,now-(lastFrame||now)||16)*speed;lastFrame=now;if(raw>=TIMELINE_TOTAL_MS)processProgress=0;else processProgress=Math.min(TIMELINE_MS,Math.max(0,raw));syncPlaybackUI();resize();drawDiagram();}else lastFrame=now;requestAnimationFrame(tick);}
function seekPhase(index){const labels=ANIMATED_SCENES[activeScene];if(!labels)return;const idx=Math.max(0,Math.min(labels.length-1,index));modelPlaying=false;processProgress=idx*Math.floor(TIMELINE_MS/labels.length);lastFrame=0;syncPlaybackUI();drawDiagram();}
canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1){dragging=true;lastPointer={x:e.clientX,y:e.clientY};}else{dragging=false;pinchDistance=0;}canvas.setPointerCapture(e.pointerId);e.preventDefault();});canvas.addEventListener('pointermove',e=>{const tracked=pointers.has(e.pointerId);if(tracked)pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const pts=[...pointers.values()];const distance=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);if(pinchDistance)zoom=Math.max(.64,Math.min(1.65,zoom*distance/pinchDistance));pinchDistance=distance;drawDiagram();return;}if(!dragging||!lastPointer){return;}yaw+=(e.clientX-lastPointer.x)*.008;pitch=Math.max(-.8,Math.min(.8,pitch+(e.clientY-lastPointer.y)*.005));lastPointer={x:e.clientX,y:e.clientY};$('viewerAngle').value='free';drawDiagram();});function releasePointer(e){pointers.delete(e.pointerId);if(pointers.size<2)pinchDistance=0;if(pointers.size===1){const only=[...pointers.values()][0];lastPointer={x:only.x,y:only.y};dragging=true;}else if(!pointers.size)dragging=false;}canvas.addEventListener('pointerup',releasePointer);canvas.addEventListener('pointercancel',releasePointer);canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(.64,Math.min(1.65,zoom-e.deltaY*.001));drawDiagram();},{passive:false});canvas.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){yaw+=e.key==='ArrowLeft'?.14:-.14;drawDiagram();e.preventDefault();}});
canvas.addEventListener('keydown',e=>{if(e.key==='+'||e.key==='='){zoom=Math.max(.64,Math.min(1.65,zoom+.1));drawDiagram();e.preventDefault();}else if(e.key==='-'){zoom=Math.max(.64,Math.min(1.65,zoom-.1));drawDiagram();e.preventDefault();}});
// Camera: never persisted; no uploads. External MediaPipe model files load only after opting in.
async function startCamera(){if(!navigator.mediaDevices?.getUserMedia){$('visionStatus').textContent='Camera requires HTTPS or localhost and a compatible browser.';return;}try{const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:1280},height:{ideal:720}}});cameraStream=stream;$('cameraVideo').srcObject=stream;await $('cameraVideo').play();$('cameraPlaceholder').hidden=true;$('cameraLivePill').hidden=false;$('cameraButton').textContent='◉ Turn off camera';$('flipCameraButton').disabled=false;$('visionButton').disabled=false;$('visionStatus').textContent='Camera ready. Place yarn and both hands in frame. Activate optional hand landmarks below.';if(tracking)startTracking();}catch(err){$('visionStatus').textContent=err?.name==='NotAllowedError'?'Camera permission was blocked. Allow access in browser settings.':`Camera unavailable: ${err.message||'unknown error'}`;}}
function stopTracking(){if(trackingTimer)cancelAnimationFrame(trackingTimer);trackingTimer=null;const c=$('handOverlay');c.getContext('2d').clearRect(0,0,c.width,c.height);}
function stopCamera(){stopTracking();if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;}$('cameraVideo').srcObject=null;$('cameraPlaceholder').hidden=false;$('cameraLivePill').hidden=true;$('cameraButton').textContent='◎ Turn on camera';$('flipCameraButton').disabled=true;$('visionButton').disabled=true;$('visionStatus').textContent='Enable your camera to check your framing. Stitch correctness still needs your confirmation.';}
async function enableTracking(){if(!cameraStream)return;const btn=$('visionButton');btn.disabled=true;btn.textContent='Loading hand model…';$('visionStatus').textContent='Downloading the optional on-device hand landmark model. Video frames stay on this device.';
try{if(!handLandmarker){const mod=await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/+esm');const vision=await mod.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm');const opts={baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numHands:2};try{handLandmarker=await mod.HandLandmarker.createFromOptions(vision,opts);}catch{opts.baseOptions.delegate='CPU';handLandmarker=await mod.HandLandmarker.createFromOptions(vision,opts);}}
tracking=true;btn.textContent='Disable hand landmarks';btn.disabled=false;$('visionStatus').textContent='Hand tracking active. Detection shows framing only—not whether your stitches are correct.';startTracking();}catch(e){tracking=false;btn.textContent='Try hand landmarks again';btn.disabled=false;$('visionStatus').textContent='Hand tracking could not load. Your camera and manual lesson steps still work.';}}
const HAND_LINKS=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
let lastTrack=0;
function startTracking(){stopTracking();const overlay=$('handOverlay'),video=$('cameraVideo'),box=$('cameraBox');const run=(now)=>{if(!tracking||!cameraStream||!handLandmarker)return;trackingTimer=requestAnimationFrame(run);if(now-lastTrack<125||video.readyState<2||video.currentTime===lastVideoTime)return;lastTrack=now;lastVideoTime=video.currentTime;const r=box.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);overlay.width=r.width*d;overlay.height=r.height*d;const ctx=overlay.getContext('2d');let results;try{results=handLandmarker.detectForVideo(video,now);}catch{return;}const hands=results.landmarks||[];const scale=Math.max(overlay.width/video.videoWidth,overlay.height/video.videoHeight),imageW=video.videoWidth*scale,imageH=video.videoHeight*scale,dx=(overlay.width-imageW)/2,dy=(overlay.height-imageH)/2;const pt=l=>({x:dx+l.x*imageW,y:dy+l.y*imageH});for(const hand of hands){ctx.lineWidth=3*d;ctx.strokeStyle='#bcd6ff';ctx.fillStyle='#ffc8d0';for(const [a,b] of HAND_LINKS){const p=pt(hand[a]),q=pt(hand[b]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();}for(const l of hand){const p=pt(l);ctx.beginPath();ctx.arc(p.x,p.y,3*d,0,Math.PI*2);ctx.fill();}}
$('visionStatus').textContent=hands.length===0?'No hands detected. Improve lighting and bring both hands into the frame.':hands.length===1?'One hand in view. Move the yarn hand into frame as well.':'Two hands in view. Framing looks useful; stitch correctness is not assessed.';};trackingTimer=requestAnimationFrame(run);}
// Controls
on('incrementCount','click',()=>count(1));on('decrementCount','click',()=>count(-1));on('newRow','click',nextRow);on('nextButton','click',markNext);on('previousButton','click',()=>changeStep(state.step-1));on('pauseButton','click',pause);on('resumeButton','click',resume);on('pauseJournalButton','click',()=>{modal('pauseOverlay',false);setView('journal');});on('backToLesson','click',()=>setView('learn'));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
on('clearHistory','click',()=>{if(confirm('Clear activity entries? Stitch totals and lesson progress will remain.')){state.events=[];persist();renderJournal();}});
on('resetAll','click',()=>{if(confirm('Reset all lessons, stitch counts, rows, and activity on this device?')){state=blank();persist();render();setView('learn');}});
function selfCheck(kind){const good=kind==='looks-good';$('reviewFeedback').textContent=good?'Lovely. If the loop moves freely and matches the lesson, continue when ready.':LESSONS[state.step].tip;eventLog(good?'Self-check':'Asked for a tip',good?`Looks good · ${LESSONS[state.step].short}`:LESSONS[state.step].short);return $('reviewFeedback').textContent;}
on('looksGood','click',()=>selfCheck('looks-good'));
on('needHelp','click',()=>selfCheck('need-tip'));
on('cameraButton','click',async()=>{if(cameraStream)stopCamera();else await startCamera();});on('flipCameraButton','click',async()=>{facing=facing==='environment'?'user':'environment';stopCamera();await startCamera();});on('visionButton','click',async()=>{if(tracking){tracking=false;stopTracking();$('visionButton').textContent='Enable hand landmarks ↗';$('visionStatus').textContent='Hand landmark overlay off. Camera stays on.';}else await enableTracking();});
on('viewerResetButton','click',()=>{[yaw,pitch]=ANGLE_PRESETS.front;zoom=1;$('viewerAngle').value='front';drawDiagram();});on('viewerPlayButton','click',()=>{if(activeScene==='finish'||activeScene==='materials')return;if(processProgress>=TIMELINE_MS)processProgress=0;modelPlaying=!modelPlaying;if(!modelPlaying)lastFrame=0;syncPlaybackUI();});on('viewerTimeline','input',()=>{const pos=Number($('viewerTimeline').value)||0;modelPlaying=false;processProgress=Math.max(0,Math.min(TIMELINE_MS,pos/1000*TIMELINE_TOTAL_MS));lastFrame=0;syncPlaybackUI();drawDiagram();});on('viewerPreviousPhase','click',()=>seekPhase(currentPhaseIndex()-1));on('viewerNextPhase','click',()=>seekPhase(currentPhaseIndex()+1));on('viewerSpeed','input',()=>{speed=parseFloat($('viewerSpeed').value)||1;});on('viewerAngle','input',()=>{const preset=ANGLE_PRESETS[$('viewerAngle').value];if(preset){[yaw,pitch]=preset;drawDiagram();}});
function about(open){modal('aboutOverlay',open);}on('aboutButton','click',()=>about(true));on('closeAbout','click',()=>about(false));on('aboutOkay','click',()=>about(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'){modal('pauseOverlay',false);modal('aboutOverlay',false);}});
window.addEventListener('pagehide',stopCamera);window.addEventListener('resize',()=>{resize();drawDiagram();});
$('viewerPlayButton').textContent=modelPlaying?'Ⅱ':'▶';render();requestAnimationFrame(tick);
if(state.paused){$('pauseSnapshot').textContent=`CURRENT STEP ${two(state.step+1)} · ${LESSONS[state.step].short}\n${state.chains} chains · ${state.singles} single crochets · row ${state.row}`;modal('pauseOverlay',true);}
// Narrow read/write surface for the optional WebMCP tool layer (webmcp.js).
window.crochetLab={
lessons:LESSONS.map(s=>({title:s.title,short:s.short,phase:s.phase,counter:s.counter||null,target:s.target??null,time:s.time,tip:s.tip})),
getState:()=>({step:state.step,done:[...state.done],chains:state.chains,singles:state.singles,row:state.row,rowStitches:state.rowStitches,events:state.events.map(e=>({...e})),lastSaved:state.lastSaved,paused:state.paused}),
getView:()=>view,changeStep,count,nextRow,markNext,setView,selfCheck};
