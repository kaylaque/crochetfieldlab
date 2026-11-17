(() => {
  const KEY='crochet-lab-studio-draft-v2',OLD_KEY='crochet-lab-studio-draft-v1',copy=value=>JSON.parse(JSON.stringify(value));
  const validPoint=value=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite)&&value.every(n=>n>=-10&&n<=10);
  function create(definition,storage){
    let draft=copy(definition),selectedCheckpoint=definition.checkpoints[0].id,selectedPoint=null,history=[],future=[],timer=null,error='',transaction=null;
    const snapshot=()=>JSON.stringify(draft),validation=()=>window.StitchScene.validateDefinition(draft),scheduleSave=()=>{clearTimeout(timer);timer=setTimeout(saveDraft,300);};
    function saveDraft(){try{storage?.setItem(KEY,JSON.stringify({definition:draft,validation:validation()}));error='';}catch(e){error=String(e.message||e);}}
    function record(change){if(!transaction)history.push(snapshot());if(history.length>50)history.shift();future=[];change();scheduleSave();}
    const checkpoint=()=>draft.checkpoints.find(c=>c.id===selectedCheckpoint);
    function movePoint(regionId,index,coords,mode){const region=checkpoint()?.regions[regionId];if(!region?.active||!Number.isInteger(index)||index<0||index>=region.points.length||!validPoint(coords))return false;const old=region.points[index],next=[...old];if(mode==='front'){next[0]=coords[0];next[1]=coords[1];}else if(mode==='side'){next[1]=coords[1];next[2]=coords[2];}else next.splice(0,3,...coords);if(transaction){region.points[index]=next;return true;}record(()=>region.points[index]=next);return true;}
    function shapeValid(candidate){try{window.StitchScene.sceneAt(candidate,0);return true;}catch{return false;}}
    function updateCandidate(change){const candidate=copy(draft);change(candidate);if(!shapeValid(candidate))return false;record(()=>{draft=candidate;});return true;}
    return {
      getState:()=>({definition:copy(draft),selectedCheckpoint,selectedPoint:copy(selectedPoint),error,storageError:error,validation:validation(),durationMs:draft.transitions.reduce((sum,t)=>sum+t.durationMs,0)+draft.holdMs}),
      selectCheckpoint:id=>{if(draft.checkpoints.some(c=>c.id===id))selectedCheckpoint=id;},
      selectPoint:(regionId,index)=>{selectedPoint=regionId==null?null:{kind:'region',regionId,index};},
      selectHand:(hand,finger)=>{selectedPoint={kind:'hand',hand,finger};},
      selectContact:contactId=>{selectedPoint={kind:'contact',contactId};},
      beginEdit:()=>{if(!transaction)transaction=snapshot();},
      endEdit:()=>{if(transaction!==null){const before=transaction;transaction=null;if(before!==snapshot()){history.push(before);if(history.length>50)history.shift();future=[];scheduleSave();}}},
      movePoint,
      moveHook:position=>{if(!validPoint(position))return false;if(transaction){checkpoint().hook.position=[...position];return true;}record(()=>checkpoint().hook.position=[...position]);return true;},
      rotateHook:orientation=>{if(!validPoint(orientation))return false;if(transaction){checkpoint().hook.orientation=[...orientation];return true;}record(()=>checkpoint().hook.orientation=[...orientation]);return true;},
      setHandPose:(hand,pose)=>{if(!['hookHand','yarnHand'].includes(hand)||!pose||!validPoint(pose.position)||!validPoint(pose.orientation))return false;return updateCandidate(d=>{d.checkpoints.find(c=>c.id===selectedCheckpoint).hands[hand]=copy(pose);});},
      setContact:(contactId,patch)=>{if(!draft.contacts.some(c=>c.id===contactId)||!patch||typeof patch!=='object')return false;return updateCandidate(d=>{const c=d.contacts.find(x=>x.id===contactId);Object.assign(c,copy(patch));});},
      cancelEdit:()=>{if(transaction!==null){draft=JSON.parse(transaction);transaction=null;}},
      setDuration:(from,to,durationMs)=>{const transition=draft.transitions.find(t=>t.from===from&&t.to===to);if(!transition||!Number.isInteger(durationMs)||durationMs<100||durationMs>10000)return false;record(()=>transition.durationMs=durationMs);return true;},
      setTransitionKey:(from,to,index,patch)=>{const transition=draft.transitions.find(t=>t.from===from&&t.to===to);if(!transition||!Number.isInteger(index)||index<0||index>=transition.keys.length||!patch||typeof patch!=='object')return false;return updateCandidate(d=>{const key=d.transitions.find(t=>t.from===from&&t.to===to).keys[index];if(Object.hasOwn(patch,'at'))key.at=patch.at;if(Object.hasOwn(patch,'hook'))key.hook=copy(patch.hook);});},
      undo:()=>{if(history.length){future.push(snapshot());draft=JSON.parse(history.pop());scheduleSave();}},
      redo:()=>{if(future.length){history.push(snapshot());draft=JSON.parse(future.pop());scheduleSave();}},
      resetCheckpoint:id=>{const index=draft.checkpoints.findIndex(c=>c.id===id);if(index<0)return false;record(()=>draft.checkpoints[index]=window.StitchScene.poseAtCheckpoint(window.StitchScene.SINGLE_CROCHET,id));return true;},
      validate:validation,
      exportJSON:()=>JSON.stringify({definition:draft,validation:validation()},null,2),
      importJSON:text=>{let next;try{const parsed=JSON.parse(text);next=parsed?.definition||parsed;if(next?.schemaVersion===1)next=window.StitchScene.upgradeV1(next);if(!shapeValid(next))throw Error('Invalid scene definition');}catch(e){error=String(e.message||e);throw e;}record(()=>{draft=copy(next);error='';if(!draft.checkpoints.some(c=>c.id===selectedCheckpoint))selectedCheckpoint=draft.checkpoints[0].id;selectedPoint=null;});return true;},
      saveDraft,
      loadDraft:()=>{try{let raw=storage?.getItem(KEY),legacy=false;if(raw===null||raw===undefined){raw=storage?.getItem(OLD_KEY);legacy=raw!==null&&raw!==undefined;}if(raw){const parsed=JSON.parse(raw);let next=parsed?.definition||parsed;if(next?.schemaVersion===1){next=window.StitchScene.upgradeV1(next);legacy=true;}if(!shapeValid(next))throw Error('Invalid saved studio draft');draft=copy(next);if(!legacy&&draft.schemaVersion!==2)throw Error('Invalid saved studio draft');}}catch(e){error=String(e.message||e);}}
    };
  }
  window.StudioEditor={create};
})();
