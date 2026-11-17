(() => {
  const ids=['ready','insert','catch-yarn','pull-up','catch-again','pull-through-both'];
  const names=['Ready','Insert','Catch yarn','Pull up a loop','Catch yarn again','Pull through both'];
  const instructions=['One loop on the hook. Find the second V from the hook.','Slide the hook under both top loops.','Catch the working yarn with the hook.','Pull the yarn back through the chain.','Yarn over once more.','Pull through both loops.'];
  const counts=[1,1,1,2,2,1];
  const sizes={fabricExit:4,firstLoop:12,chainOpeningFront:4,chainOpeningBack:4,hookContact:5,newLoop:12,workingYarn:6};
  const clone=v=>JSON.parse(JSON.stringify(v));
  const point=(x,y,z=0)=>[x,y,z];
  const throat=hook=>{const roll=hook.orientation[2],pitch=hook.orientation[0],s=hook.scale;return [hook.position[0]+s*(.9*Math.cos(roll)-.23*Math.sin(roll)),hook.position[1]+s*(.9*Math.sin(roll)+.23*Math.cos(roll)),hook.position[2]+s*(.9*Math.cos(pitch)-.23*Math.sin(pitch))];};
  function seed(){
    // The hook travels through the highlighted V in depth, lifts the caught yarn,
    // then returns for the second catch. Every strand stays attached to its neighbour.
    const poses=[
      {x:-.38,y:.12,z:-.88,roll:-.12,loop:.13},
      {x:.23,y:-.46,z:-.41,roll:0,loop:.03},
      {x:.38,y:-.39,z:.22,roll:.35,loop:.08},
      {x:.25,y:.07,z:-.17,roll:-.18,loop:.3},
      {x:.38,y:.1,z:.14,roll:.28,loop:.33},
      {x:.28,y:.22,z:-.22,roll:-.25,loop:.08}
    ];
    return {schemaVersion:1,id:'single-crochet',technique:{target:'second-chain',insertion:'both-top-loops',yarnOver:'back-to-front',handed:'right'},foundation:{chains:7,targetIndex:5},checkpoints:ids.map((id,i)=>{
      const pose=poses[i],hook={position:point(pose.x,pose.y,pose.z),orientation:[0,0,pose.roll],scale:.7};
      const contact=throat(hook),anchor=point(.88,-.28),link=point(contact[0]-.09,contact[1]-.035,contact[2]);
      const opening=[point(.72,-.35,.18),point(.8,-.22,.18),point(.96,-.22,.18),point(1.04,-.35,.18)];
      const fabric=[point(.44,-.32),point(.58,-.3),point(.72,-.29),anchor];
      const first=Array.from({length:12},(_,j)=>{
        if(j===0)return [...anchor];
        if(j===11)return [...link];
        const t=(j-1)/9,centerX=(anchor[0]+link[0])/2;
        return point(centerX-.13+.26*t,pose.y+.06-pose.loop*Math.sin(Math.PI*t),contact[2]-.12);
      });
      const active=counts[i]===2;
      const extra=Array.from({length:12},(_,j)=>{
        if(!active)return [...link];
        if(j===0||j===11)return [...link];
        const t=j/11;
        return point(link[0]+.35*Math.sin(Math.PI*t),link[1]-.25*Math.sin(Math.PI*t),link[2]+.12*Math.sin(Math.PI*t));
      });
      const contactPath=Array.from({length:5},(_,j)=>point(link[0]+(contact[0]-link[0])*j/4,link[1]+(contact[1]-link[1])*j/4,link[2]+(contact[2]-link[2])*j/4));
      const yarn=[contact,point(contact[0]+.12,contact[1]+.18,contact[2]+.1),point(1.42,.36,.2),point(2,.55,.1),point(2.5,.62,0),point(3,.62,0)];
      const regions={fabricExit:{id:'fabricExit',points:fabric,active:true},firstLoop:{id:'firstLoop',points:first,active:true},chainOpeningFront:{id:'chainOpeningFront',points:opening.map(p=>[...p]),active:true},chainOpeningBack:{id:'chainOpeningBack',points:opening.map(p=>[p[0],p[1],p[2]+.08]),active:true},hookContact:{id:'hookContact',points:contactPath,active:true},newLoop:{id:'newLoop',points:extra,active},workingYarn:{id:'workingYarn',points:yarn,active:true}};
      return {id,name:names[i],instruction:instructions[i],loopsOnHook:counts[i],regions,hook};
    }),transitions:ids.slice(0,-1).map((from,i)=>({from,to:ids[i+1],durationMs:1000,slackLength:2})),holdMs:1000};
  }
  const def=seed();
  const fingers=['thumb','index','middle','ring','pinky'],handNames=['hookHand','yarnHand'];
  const handPose=(position,orientation,joints)=>({position,orientation,joints});
  const authoredHands=[
    {hook:[[-.5,.08,-1.06],[0,0,-.12],{thumb:[-.2,-.5],index:[-.2,-.45],middle:[.15,.25],ring:[.25,.35],pinky:[.3,.4]}],yarn:[[.95,-.12,.15],[0,0,-.15],{thumb:[.3,.5],index:[-.1,.1],middle:[.2,.25],ring:[.3,.35],pinky:[.35,.4]}]},
    {hook:[[.11,-.5,-.59],[.05,0,0],{thumb:[-.2,-.45],index:[-.25,-.5],middle:[.1,.2],ring:[.2,.3],pinky:[.3,.35]}],yarn:[[.98,-.1,.16],[0,0,-.12],{thumb:[.25,.45],index:[-.05,.05],middle:[.2,.25],ring:[.3,.35],pinky:[.35,.4]}]},
    {hook:[[.26,-.43,.04],[.08,.12,.35],{thumb:[-.25,-.5],index:[-.25,-.55],middle:[.1,.2],ring:[.2,.3],pinky:[.3,.35]}],yarn:[[1,-.08,.17],[0,0,-.1],{thumb:[.25,.45],index:[-.05,.05],middle:[.2,.25],ring:[.3,.35],pinky:[.35,.4]}]},
    {hook:[[.13,.03,-.35],[0,-.05,-.18],{thumb:[-.2,-.45],index:[-.2,-.5],middle:[.1,.2],ring:[.2,.3],pinky:[.3,.35]}],yarn:[[1.04,-.02,.2],[0,0,-.05],{thumb:[.2,.4],index:[-.1,0],middle:[.2,.25],ring:[.3,.35],pinky:[.35,.4]}]},
    {hook:[[.26,.06,-.04],[0,.1,.28],{thumb:[-.25,-.5],index:[-.25,-.55],middle:[.1,.2],ring:[.2,.3],pinky:[.3,.35]}],yarn:[[1,-.06,.17],[0,0,-.1],{thumb:[.25,.45],index:[-.05,.05],middle:[.2,.25],ring:[.3,.35],pinky:[.35,.4]}]},
    {hook:[[.16,.2,-.4],[0,-.1,-.25],{thumb:[-.2,-.45],index:[-.2,-.5],middle:[.1,.2],ring:[.2,.3],pinky:[.3,.35]}],yarn:[[.95,-.12,.15],[0,0,-.15],{thumb:[.3,.5],index:[-.1,.1],middle:[.2,.25],ring:[.3,.35],pinky:[.35,.4]}]}
  ];
  const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
  for(let i=0;i<def.checkpoints.length;i++){
    const cp=def.checkpoints[i],authored=authoredHands[i];
    cp.hands={hookHand:handPose(...authored.hook),yarnHand:handPose(...authored.yarn)};
  }
  def.schemaVersion=2;
  def.transitions.forEach((transition,i)=>{
    const a=def.checkpoints[i],b=def.checkpoints[i+1];
    transition.keys=[.33,.66].map(at=>{
      const hook={position:mix(a.hook.position,b.hook.position,at),orientation:mix(a.hook.orientation,b.hook.orientation,at),scale:a.hook.scale};
      const hands=Object.fromEntries(handNames.map(hand=>[hand,{position:mix(a.hands[hand].position,b.hands[hand].position,at),orientation:mix(a.hands[hand].orientation,b.hands[hand].orientation,at),joints:Object.fromEntries(fingers.map(f=>[f,mix(a.hands[hand].joints[f],b.hands[hand].joints[f],at)]))}]));
      const regions=Object.fromEntries(Object.keys(sizes).map(key=>[key,{active:key==='newLoop'&&i===4?true:at<.5?a.regions[key].active:b.regions[key].active,points:a.regions[key].points.map((p,j)=>mix(p,b.regions[key].points[j],at))}]));
      const contact=throat(hook);regions.hookContact.points.at(-1).splice(0,3,...contact);regions.workingYarn.points[0]=[...contact];
      return {at,hook,hands,regions,loopsOnHook:i===4?2:at<.5?a.loopsOnHook:b.loopsOnHook};
    });
  });
  def.contacts=[
    {id:'hook-grip',type:'grip',hand:'hookHand',finger:'thumb',anchor:[-.5,0,0],regionId:'hookContact',pointIndex:0,fromCheckpointId:null,start:0,end:1},
    {id:'foundation-pinch',type:'pinch',hand:'yarnHand',finger:'thumb',anchor:[.88,-.28,0],regionId:'fabricExit',pointIndex:3,fromCheckpointId:null,start:0,end:1},
    {id:'index-guide',type:'guide',hand:'yarnHand',finger:'index',anchor:[.8,.3,.1],regionId:'workingYarn',pointIndex:2,fromCheckpointId:null,start:0,end:1},
    {id:'first-catch',type:'catch',hand:'hookHand',finger:'index',anchor:[0,0,0],regionId:'workingYarn',pointIndex:0,fromCheckpointId:'insert',start:.55,end:1},
    {id:'second-catch',type:'catch',hand:'hookHand',finger:'index',anchor:[0,0,0],regionId:'workingYarn',pointIndex:0,fromCheckpointId:'pull-up',start:.55,end:1}
  ];
  const finiteVector=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(Number.isFinite);
  const validHook=h=>!!h&&finiteVector(h.position,3)&&finiteVector(h.orientation,3)&&Number.isFinite(h.scale)&&h.scale>0;
  const validHand=h=>!!h&&finiteVector(h.position,3)&&finiteVector(h.orientation,3)&&!!h.joints&&Object.keys(h.joints).length===fingers.length&&fingers.every(f=>Array.isArray(h.joints[f])&&h.joints[f].length===2&&h.joints[f].every(x=>Number.isFinite(x)&&x>=-1.6&&x<=1.6));
  const validRegions=r=>!!r&&Object.keys(r).length===Object.keys(sizes).length&&Object.keys(sizes).every(key=>{const region=r[key];return !!region&&typeof region.active==='boolean'&&Array.isArray(region.points)&&region.points.length===sizes[key]&&region.points.every(p=>finiteVector(p,3));});
  function shapeIssues(d){
    const a=[],fail=(code,message,checkpointId,regionId)=>a.push({code,status:'FAIL',message,checkpointId,regionId});
    if(!d||d.schemaVersion!==2||!Array.isArray(d.checkpoints)){fail('schema','Invalid schema or checkpoint list');return a;}
    if(d.checkpoints.length!==6)fail('checkpoint-count','Expected six checkpoints');
    if(!d.technique||d.technique.target!=='second-chain'||d.technique.insertion!=='both-top-loops'||d.technique.yarnOver!=='back-to-front'||d.technique.handed!=='right')fail('technique','Invalid single-crochet technique');
    if(!d.foundation||d.foundation.chains!==7||d.foundation.targetIndex!==5)fail('foundation','Foundation must contain seven chains targeting index 5');
    if(!Array.isArray(d.transitions)||d.transitions.length!==5)fail('transitions','Expected five transitions');
    else d.transitions.forEach((t,i)=>{
      if(!t||t.from!==ids[i]||t.to!==ids[i+1])fail('transition-order',`Invalid transition at index ${i}`);
      if(!Number.isInteger(t.durationMs)||t.durationMs<100||t.durationMs>10000)fail('duration',`Invalid duration for ${t?.from} → ${t?.to}`);
      if(!Array.isArray(t.keys)||!t.keys.length)fail('keys',`Missing transition keys for ${t?.from}`);
      else{let previous=0;for(const key of t.keys){if(!key||!Number.isFinite(key.at)||key.at<=previous||key.at>=1)fail('key-time',`Invalid or unsorted transition key for ${t.from}`);previous=key?.at??previous;if(!validHook(key?.hook)||!key.hands||Object.keys(key.hands).length!==handNames.length||!handNames.every(name=>validHand(key.hands[name]))||!validRegions(key.regions)||![1,2].includes(key.loopsOnHook))fail('key-shape',`Malformed transition key for ${t.from}`);}}
    });
    if(!Number.isInteger(d.holdMs)||d.holdMs<0)fail('hold','Invalid terminal hold');
    const contactIds=new Set();
    for(const contact of Array.isArray(d.contacts)?d.contacts:[]){
      if(!contact||typeof contact.id!=='string'||!contact.id||contactIds.has(contact.id))fail('contact-id','Missing or duplicate contact id');
      else contactIds.add(contact.id);
      if(!contact||!['grip','pinch','guide','catch'].includes(contact.type)||!handNames.includes(contact.hand)||!fingers.includes(contact.finger)||!finiteVector(contact.anchor,3)||!(contact.regionId in sizes)||!Number.isInteger(contact.pointIndex)||contact.pointIndex<0||contact.pointIndex>=sizes[contact.regionId]||!Number.isFinite(contact.start)||!Number.isFinite(contact.end)||contact.start<0||contact.end>1||contact.start>contact.end||(contact.fromCheckpointId!==null&&!ids.slice(0,-1).includes(contact.fromCheckpointId)))fail('contact-shape',`Malformed contact ${contact?.id}`);
    }
    d.checkpoints.forEach((c,i)=>{
      if(!c||c.id!==ids[i])fail('checkpoint-order',`Unexpected checkpoint at index ${i}`,c?.id);
      if(!c)return;
      if(!validRegions(c.regions))fail('regions',`Malformed regions in ${c.id}`,c.id);
      for(const key of Object.keys(c.regions||{}))if(!(key in sizes))fail('region-extra',`Unknown region ${key}`,c.id,key);
      if(c.loopsOnHook!==counts[i])fail('loop-count',`Invalid loop count for ${c.id}`,c.id);
      if(!validHook(c.hook))fail('hook','Invalid hook pose',c.id);
      if(!c.hands||Object.keys(c.hands).length!==handNames.length||!handNames.every(name=>validHand(c.hands[name])))fail('hand','Invalid or incomplete hand poses',c.id);
    });
    return a;
  }
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
  function validateTransition(d,fromId,toId){
    const i=ids.indexOf(fromId),j=ids.indexOf(toId);
    if(i<0||j!==i+1)return [{code:'transition-order',status:'FAIL',message:`Unknown or nonadjacent transition ${fromId} → ${toId}`}];
    const a=d.checkpoints[i],b=d.checkpoints[j],transition=d.transitions[i],duration=transition.durationMs,out=[];
    const length=c=>Object.values(c.regions).filter(r=>r.active).reduce((sum,r)=>sum+r.points.slice(1).reduce((n,p,k)=>n+dist(p,r.points[k]),0),0);
    if(length(b)-length(a)>(transition.slackLength||0)+.02)out.push({code:'yarn-growth',status:'FAIL',message:`Active yarn growth exceeds slack for ${fromId} → ${toId}`});
    const target=[(d.foundation.targetIndex-3)*.44,-.28,0],reported=new Set();
    let previous=a,hookJump=0,pointJump=0;
    const inspect=pose=>{
      const contact=pose.regions.hookContact.points.at(-1),checks=[
        ['foundation-anchor',dist(pose.regions.fabricExit.points.at(-1),target)>.02,'Fabric exit is not anchored to the target foundation chain','fabricExit'],
        ['hook-contact',dist(contact,throat(pose.hook))>.02,'Hook throat contact gap exceeds .02','hookContact'],
        ['junction',dist(contact,pose.regions.workingYarn.points[0])>.02,'Hook-contact yarn is disconnected from working yarn','workingYarn'],
        ['loop-active',pose.regions.newLoop.active!==(pose.loopsOnHook===2),'New-loop active state disagrees with loop count','newLoop']
      ];
      for(const [code,invalid,message,regionId] of checks)if(invalid&&!reported.has(code)){reported.add(code);out.push({code,status:'FAIL',message:`${message} during ${fromId} → ${toId}`,checkpointId:fromId,regionId});}
    };
    inspect(previous);
    for(const key of transition.keys)inspect(key);
    const sampleTimes=new Set();for(let ms=10;ms<duration;ms+=10)sampleTimes.add(ms);
    for(const key of transition.keys)sampleTimes.add(key.at*duration);
    sampleTimes.add(duration);
    for(const ms of [...sampleTimes].sort((x,y)=>x-y)){
      const current=interpolateTransition(d,i,ms/duration);
      hookJump=Math.max(hookJump,dist(previous.hook.position,current.hook.position));
      for(const key of Object.keys(sizes))for(let k=0;k<current.regions[key].points.length;k++)pointJump=Math.max(pointJump,dist(previous.regions[key].points[k],current.regions[key].points[k]));
      inspect(current);previous=current;
    }
    if(hookJump>.15)out.push({code:'hook-jump',status:'WARN',message:`Hook moves ${hookJump.toFixed(3)} within 10 ms`,checkpointId:fromId});
    if(pointJump>.15)out.push({code:'point-jump',status:'WARN',message:`Yarn point moves ${pointJump.toFixed(3)} within 10 ms`,checkpointId:fromId});
    return out;
  }
  function validateDefinition(d){
    const issues=shapeIssues(d),unverified=[
      {code:'practitioner-review',status:'UNVERIFIED',message:'Crochet correctness requires practitioner review'},
      {code:'novice-comprehension',status:'UNVERIFIED',message:'Beginner comprehension requires human review'}
    ];
    if(issues.length)return [...issues,...unverified];
    const target=[(d.foundation.targetIndex-3)*.44,-.28,0];
    for(let i=0;i<6;i++){
      const c=d.checkpoints[i],contact=c.regions.hookContact.points.at(-1),expected=throat(c.hook);
      if(dist(c.regions.fabricExit.points.at(-1),target)>.02)issues.push({code:'foundation-anchor',status:'FAIL',message:'Fabric exit is not anchored to the target foundation chain',checkpointId:c.id,regionId:'fabricExit'});
      if(dist(contact,expected)>.02)issues.push({code:'hook-contact',status:'FAIL',message:'Hook throat contact gap exceeds .02',checkpointId:c.id,regionId:'hookContact'});
      if(dist(contact,c.regions.workingYarn.points[0])>.02)issues.push({code:'junction',status:'FAIL',message:'Hook-contact yarn is disconnected from working yarn',checkpointId:c.id,regionId:'workingYarn'});
      if(c.regions.newLoop.active!==(c.loopsOnHook===2))issues.push({code:'loop-active',status:'FAIL',message:'New-loop active state disagrees with loop count',checkpointId:c.id,regionId:'newLoop'});
      const active=Object.values(c.regions).filter(r=>r.active&&r.id!=='hookContact');
      for(let a=0;a<active.length;a++)for(let b=a;b<active.length;b++){
        const ra=active[a],rb=active[b];let minimum=Infinity;
        for(let p=0;p<ra.points.length;p++)for(let q=0;q<rb.points.length;q++){
          if(ra===rb&&(Math.abs(p-q)<=1||p===0&&q===ra.points.length-1))continue;
          // These two endpoints are intentionally joined into a continuous strand.
          if(ra.id==='fabricExit'&&rb.id==='firstLoop'&&p===ra.points.length-1&&q===0)continue;
          if(ra.id==='firstLoop'&&rb.id==='newLoop'&&p===ra.points.length-1&&(q===0||q===rb.points.length-1))continue;
          minimum=Math.min(minimum,dist(ra.points[p],rb.points[q]));
        }
        if(minimum<.03)issues.push({code:'yarn-clearance',status:'WARN',message:`Yarn regions ${ra.id} and ${rb.id} approach within .03`,checkpointId:c.id,regionId:ra.id,minimumDistance:minimum});
      }
      if(i<5)issues.push(...validateTransition(d,ids[i],ids[i+1]));
    }
    return [...issues,...unverified];
  }
  const interpolatePose=(a,b,t)=>{const e=t*t*(3-2*t),pose=clone(a);pose.hook.position=mix(a.hook.position,b.hook.position,e);pose.hook.orientation=mix(a.hook.orientation,b.hook.orientation,e);for(const hand of handNames){pose.hands[hand].position=mix(a.hands[hand].position,b.hands[hand].position,e);pose.hands[hand].orientation=mix(a.hands[hand].orientation,b.hands[hand].orientation,e);for(const f of fingers)pose.hands[hand].joints[f]=mix(a.hands[hand].joints[f],b.hands[hand].joints[f],e);}for(const key of Object.keys(sizes))pose.regions[key].points=a.regions[key].points.map((p,i)=>mix(p,b.regions[key].points[i],e));pose.regions.newLoop.active=a.regions.newLoop.active||b.regions.newLoop.active;return pose;};
  function interpolateTransition(d,index,local){
    const transition=d.transitions[index],from=d.checkpoints[index],to=d.checkpoints[index+1],stops=[{at:0,pose:from},...transition.keys.map(key=>({at:key.at,pose:{hook:key.hook,hands:key.hands,regions:key.regions,loopsOnHook:key.loopsOnHook}})),{at:1,pose:to}];
    let segment=0;while(segment<stops.length-2&&local>stops[segment+1].at)segment++;
    const left=stops[segment],right=stops[segment+1],fraction=(local-left.at)/(right.at-left.at),pose=interpolatePose({...from,...left.pose},{...to,...right.pose},fraction);
    for(const key of Object.keys(sizes))pose.regions[key].active=local>=right.at?right.pose.regions[key].active:left.pose.regions[key].active;
    pose.loopsOnHook=local>=right.at?right.pose.loopsOnHook:left.pose.loopsOnHook;
    pose.id=from.id;pose.name=from.name;pose.instruction=from.instruction;
    return pose;
  }
  function sceneAt(d,t){
    if(!Number.isFinite(t))throw new TypeError('StitchScene: time must be finite');
    if(shapeIssues(d).length)throw new Error('StitchScene: malformed definition');
    const total=d.transitions.reduce((sum,x)=>sum+x.durationMs,0),time=Math.max(0,Math.min(total+d.holdMs,t));
    if(time===0){const pose=clone(d.checkpoints[0]);return {...pose,checkpointId:ids[0],nextCheckpointId:null,progress:0,settled:true,hands:pose.hands,contacts:d.contacts.filter(c=>c.fromCheckpointId===null&&c.start===0).map(clone)};}
    let start=0,index=5,local=1,settled=true;
    for(let i=0;i<5;i++){const end=start+d.transitions[i].durationMs;if(time<=end){index=i;local=(time-start)/d.transitions[i].durationMs;settled=local===1;break;}start=end;}
    let pose,progress;
    if(index===5||settled){pose=clone(d.checkpoints[index===5?5:index+1]);progress=1;index=index===5?5:index+1;}
    else{
      pose=interpolateTransition(d,index,local);progress=local;settled=false;
    }
    const contactTime=Math.max(0,Math.min(1,time/total));
    const contacts=d.contacts.filter(contact=>{
      const i=contact.fromCheckpointId===null?-1:ids.indexOf(contact.fromCheckpointId),begin=i<0?contact.start: (d.transitions.slice(0,i).reduce((n,x)=>n+x.durationMs,0)+contact.start*d.transitions[i].durationMs)/total,end=i<0?contact.end:(d.transitions.slice(0,i).reduce((n,x)=>n+x.durationMs,0)+contact.end*d.transitions[i].durationMs)/total;
      return contactTime>=begin&&contactTime<=end;
    }).map(clone);
    if(!settled){start=d.transitions.slice(0,index).reduce((n,x)=>n+x.durationMs,0);}
    return {...pose,checkpointId:ids[index],nextCheckpointId:settled?null:ids[index+1],progress,settled,hands:pose.hands,contacts};
  }
  const poseAtCheckpoint=(d,id)=>{const p=d.checkpoints.find(c=>c.id===id);if(!p)throw new Error(`Unknown checkpoint ${id}`);return clone(p);};
  function mirrorScene(frame){const out=clone(frame);for(const r of Object.values(out.regions||{}))for(const p of r.points)p[0]*=-1;out.hook.position[0]*=-1;out.hook.orientation[1]*=-1;out.hook.orientation[2]*=-1;for(const h of Object.values(out.hands||{})){h.position[0]*=-1;h.orientation[1]*=-1;h.orientation[2]*=-1;}for(const c of out.contacts||[])c.anchor[0]*=-1;return out;}
  const upgradeV1=source=>{if(!source||source.schemaVersion!==1||!Array.isArray(source.checkpoints)||source.checkpoints.length!==6||!Array.isArray(source.transitions)||source.transitions.length!==5)throw new Error('Invalid v1 scene definition');const out=clone(def);out.id=source.id;out.technique=clone(source.technique);out.foundation=clone(source.foundation);out.holdMs=source.holdMs;out.checkpoints=source.checkpoints.map((checkpoint,i)=>({...clone(checkpoint),hands:clone(def.checkpoints[i].hands)}));out.transitions=source.transitions.map((transition,i)=>({...clone(transition),keys:clone(def.transitions[i].keys)}));out.contacts=clone(def.contacts);out.review={hands:'UNVERIFIED',technique:'UNVERIFIED'};if(shapeIssues(out).length)throw new Error('Invalid v1 scene definition');return out;};
  window.StitchScene={SINGLE_CROCHET:def,sceneAt,poseAtCheckpoint,mirrorScene,validateDefinition,validateTransition,upgradeV1};
})();
