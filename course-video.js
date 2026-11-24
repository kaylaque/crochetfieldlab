/* Times are observations from https://www.youtube.com/watch?v=aAxGTnVNJiE:
   materials 0:23–0:53; knot 0:53–1:16; grip 1:16–1:52;
   chain motion and counting 1:52–3:35; single crochet 3:35–5:25;
   repeat and turn 4:35–6:30; fasten off and weave 6:45–7:45.
   The two chain lessons and the two stitch lessons deliberately overlap. */
(() => {
  const segments = [
    {id:'materials',start:23,end:53,phases:[{time:23,label:'Choose yarn'},{time:36,label:'Choose a crochet hook'}]},
    {id:'knot',start:53,end:76,phases:[{time:53,label:'Hold the yarn'},{time:60,label:'Twist the loop'},{time:68,label:'Pull through and place on hook'}]},
    {id:'grip',start:76,end:112,phases:[{time:76,label:'Hold the hook'},{time:100,label:'Guide the working yarn'}]},
    {id:'motion',start:112,end:180,phases:[{time:112,label:'Hold hook and yarn'},{time:125,label:'Turn the hook and pull through'},{time:141,label:'Repeat the chain movement'}]},
    {id:'chain',start:112,end:215,phases:[{time:112,label:'Start the chain'},{time:170,label:'Repeat yarn over and pull through'},{time:190,label:'Count the chains'}]},
    {id:'single',start:215,end:325,phases:[{time:215,label:'Begin single crochet'},{time:250,label:'Insert into the chain'},{time:275,label:'Repeat the stitch'}]},
    {id:'swatch',start:275,end:390,phases:[{time:275,label:'Work across the row'},{time:325,label:'Chain and turn for the next row'},{time:350,label:'Work the next row'}]},
    {id:'finish',start:405,end:465,phases:[{time:405,label:'Finish the last stitch'},{time:415,label:'Cut the yarn and secure the loop'},{time:422,label:'Weave in the ends'}]}
  ];
  const KEY = 'crochet-field-lab-video-positions-v1';
  const URL = 'https://www.youtube.com/watch?v=aAxGTnVNJiE&t=';
  const $ = id => document.getElementById(id);
  let index=0, player=null, ready=false, loading=false, generation=0, deadline=null, interval=null, script=null, position=segments[0].start, ended=false, positions={};
  const current=()=>segments[index];
  function readPositions(){try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');return data && typeof data==='object' && !Array.isArray(data)?data:{};}catch{return {};}}
  function restored(segment){const value=positions[segment.id];return typeof value==='number' && Number.isFinite(value) && value>=segment.start && value<segment.end?value:segment.start;}
  function status(message){$('videoStatus').textContent=message;}
  function save(value=position){
    const segment=current();
    positions[segment.id]=Number.isFinite(value)&&value>=segment.start&&value<segment.end?value:segment.start;
    try{localStorage.setItem(KEY,JSON.stringify(positions));}catch{status('Video position could not be saved on this device.');}
  }
  function controls(){
    ['videoPreviousPhase','videoNextPhase','videoRestart'].forEach(id=>{$(id).disabled=!ready;});
    const phases=current().phases; let n=0; for(let i=1;i<phases.length;i++) if(position>=phases[i].time)n=i;
    $('videoPhase').textContent=`Phase ${n+1} of ${phases.length} · ${phases[n].label}`;
    $('videoTutorialLink').href=URL+current().start+'s';
  }
  function stopTimer(){if(interval!==null){clearInterval(interval);interval=null;}}
  function readTime(){try{return player?.getCurrentTime();}catch{return undefined;}}
  function pause(){
    if(!ready)return;
    const time=readTime(); if(Number.isFinite(time))position=time;
    stopTimer(); player.pauseVideo(); save(ended?current().start:position); controls();
  }
  function seek(time){
    if(!ready)return;
    stopTimer(); player.pauseVideo(); position=time; ended=false; player.cueVideoById({videoId:'aAxGTnVNJiE',startSeconds:time}); save(); controls();
  }
  function sample(){
    if(!ready)return;
    const time=readTime(); if(!Number.isFinite(time))return;
    const segment=current();
    if(time<segment.start || time>=segment.end){
      ended=time>=segment.end; position=ended?segment.end:segment.start;
      stopTimer(); player.pauseVideo(); player.cueVideoById({videoId:'aAxGTnVNJiE',startSeconds:position}); save(ended?segment.start:position); controls(); return;
    }
    position=time; controls();
  }
  function openLesson(next){
    if(ready)pause();
    index=Math.max(0,Math.min(segments.length-1,next)); position=restored(current()); ended=false; controls();
    if(ready){player.cueVideoById({videoId:'aAxGTnVNJiE',startSeconds:position}); player.pauseVideo();}
  }
  function fail(token){
    if(token!==generation)return;
    generation++; clearTimeout(deadline); deadline=null; stopTimer(); ready=false; loading=false;
    if(player){try{player.destroy();}catch{} player=null;}
    if(script && !window.YT?.Player){script.remove();script=null;}
    $('videoLoad').disabled=false; $('videoLoad').hidden=false; $('videoLoad').textContent='Try loading video again'; controls();
    status('Video unavailable. Open this lesson on YouTube.');
  }
  function createPlayer(token){
    if(token!==generation || !loading)return;
    const mount=document.createElement('div'); mount.id='courseVideoPlayer'; $('videoPlayerHost').replaceChildren(mount);
    try{
      player=new window.YT.Player('courseVideoPlayer', {videoId:'aAxGTnVNJiE',playerVars:{autoplay:0,controls:1,origin:window.location.origin},events:{
        onReady(event){
          if(token!==generation || !loading){try{event.target.destroy();}catch{} return;}
          player=event.target; ready=true; loading=false; clearTimeout(deadline); deadline=null;
          try{player.getIframe().setAttribute('title','Crochet tutorial for the current lesson');}catch{}
          player.cueVideoById({videoId:'aAxGTnVNJiE',startSeconds:position}); player.pauseVideo();
          $('videoLoad').hidden=true; status('Video ready. Use the player controls to play.'); controls();
        },
        onError(){fail(token);},
        onStateChange(event){
          if(token!==generation || !ready)return;
          if(event.data===1){
            if(ended){ended=false;position=current().start;player.seekTo(position,true);save();}
            stopTimer(); interval=setInterval(sample,250);
          }else{
            stopTimer(); if(event.data===2 || event.data===0){sample();save(ended?current().start:position);}
          }
        }
      }});
    }catch{fail(token);}
  }
  function load(){
    if(ready||loading)return;
    loading=true; const token=++generation; $('videoLoad').disabled=true; status('Loading video…');
    deadline=setTimeout(()=>fail(token),15000);
    if(window.YT?.Player){createPlayer(token);return;}
    window.onYouTubeIframeAPIReady=()=>createPlayer(token);
    if(!script){script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>fail(token);document.head.appendChild(script);}
  }
  function reset(){
    stopTimer(); positions={}; try{localStorage.removeItem(KEY);}catch{status('Video position could not be saved on this device.');}
    position=current().start; ended=false;
    if(ready){player.pauseVideo();player.cueVideoById({videoId:'aAxGTnVNJiE',startSeconds:position});} controls();
  }
  function init(){
    positions=readPositions(); controls();
    $('videoLoad').addEventListener('click',load);
    $('videoRestart').addEventListener('click',()=>seek(current().start));
    $('videoPreviousPhase').addEventListener('click',()=>{const p=current().phases;let n=0;for(let i=1;i<p.length;i++)if(position>=p[i].time)n=i;seek(p[Math.max(0,n-1)].time);});
    $('videoNextPhase').addEventListener('click',()=>{const p=current().phases;let n=0;for(let i=1;i<p.length;i++)if(position>=p[i].time)n=i;seek(p[Math.min(p.length-1,n+1)].time);});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
    window.addEventListener('pagehide',pause);
  }
  window.CourseVideo={init,openLesson,pause,reset};
})();
