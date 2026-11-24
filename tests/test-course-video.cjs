const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');
const sourcePath = path.join(__dirname, '..', 'course-video.js');
assert.ok(fs.existsSync(sourcePath), 'course video controller must exist');
const source = fs.readFileSync(sourcePath, 'utf8');
const KEY = 'crochet-field-lab-video-positions-v1';
const PROGRESS = 'crochet-field-lab-progress-v1';

function setup({initial = {}, storageThrows = false} = {}) {
  const values = new Map(Object.entries(initial));
  const listeners = {};
  const elements = new Map();
  let timerId = 0;
  const timeouts = new Map(), intervals = new Map(), scripts = [];
  function element(id) {
    if (!elements.has(id)) elements.set(id, {id, disabled:false, hidden:false, textContent:'', href:'', children:[],
      addEventListener(type, fn) { listeners[id + ':' + type] = fn; },
      setAttribute(name, value) { this[name] = value; },
      appendChild(child) { this.children.push(child); if (child.tagName === 'SCRIPT') scripts.push(child); },
      replaceChildren(...children) { this.children = children; },
      remove() { this.removed = true; }});
    return elements.get(id);
  }
  const doc = {hidden:false, getElementById:element, head:element('head'),
    createElement(tag) { const node = element('created-' + Math.random()); node.tagName = tag.toUpperCase(); return node; },
    addEventListener(type, fn) { listeners['document:' + type] = fn; }};
  const win = {location:{origin:'http://localhost:8766'}, addEventListener(type, fn) { listeners['window:' + type] = fn; }};
  const storage = {getItem(k) { if (storageThrows) throw Error('storage'); return values.get(k) ?? null; },
    setItem(k,v) { if (storageThrows) throw Error('storage'); values.set(k,v); },
    removeItem(k) { if (storageThrows) throw Error('storage'); values.delete(k); }};
  const ctx = vm.createContext({window:win, document:doc, localStorage:storage, console,
    setTimeout(fn) { const id=++timerId; timeouts.set(id,fn); return id; }, clearTimeout(id) { timeouts.delete(id); },
    setInterval(fn) { const id=++timerId; intervals.set(id,fn); return id; }, clearInterval(id) { intervals.delete(id); }});
  vm.runInContext(source, ctx, {filename:'course-video.js'});
  win.CourseVideo.init();
  let player;
  function installPlayer() {
    win.YT = {Player:class {
      constructor(id, config) { this.id=id; this.config=config; this.time=0; this.state=-1; player=this; }
      cueVideoById(arg) { this.time=arg.startSeconds; this.state=5; }
      seekTo(value) { this.time=value; this.state=1; }
      pauseVideo() { this.state=2; this.pauseCount=(this.pauseCount||0)+1; }
      getCurrentTime() { return this.time; }
      getPlayerState() { return this.state; }
      destroy() { this.destroyed=true; }
      ready() { this.config.events.onReady({target:this}); }
      stateChange(state) { this.state=state; this.config.events.onStateChange({target:this,data:state}); }
      error() { this.config.events.onError({target:this,data:100}); }
    }};
    win.onYouTubeIframeAPIReady();
  }
  return {win, doc, values, scripts, element, click(id) { assert.ok(listeners[id+':click']); listeners[id+':click'](); },
    event(name) { assert.ok(listeners[name]); listeners[name](); }, installPlayer, player:()=>player,
    tick() { for (const fn of [...intervals.values()]) fn(); }, timeout() { for (const fn of [...timeouts.values()]) fn(); }};
}

const e = setup({initial:{[PROGRESS]:'{"chains":3}'}});
e.win.CourseVideo.openLesson(0);
assert.equal(e.scripts.length, 0, 'no YouTube API before consent');
assert.equal(e.element('videoPreviousPhase').disabled, true);
e.click('videoLoad');
assert.equal(e.scripts.length, 1);
e.win.CourseVideo.openLesson(4);
e.installPlayer();
e.player().ready();
const pausesBeforeBuffering=e.player().pauseCount;
e.player().time=0; e.player().stateChange(-1); e.player().stateChange(3);
assert.equal(e.player().pauseCount,pausesBeforeBuffering, 'startup and buffering must not pause before the cue settles');
e.player().time=112;
assert.equal(e.player().time, 112, 'late readiness uses latest lesson');
assert.notEqual(e.player().state, 1, 'ready starts paused');
assert.equal(e.element('videoPreviousPhase').disabled, false);
e.click('videoNextPhase');
assert.ok(e.player().time > 112);
assert.notEqual(e.player().state,1, 'phase navigation stays paused');
e.click('videoPreviousPhase'); e.click('videoPreviousPhase');
assert.equal(e.player().time, 112, 'previous clamps at first phase');
e.click('videoRestart'); assert.equal(e.player().time, 112);
e.player().time=190; e.player().stateChange(2);
e.win.CourseVideo.openLesson(1); e.player().time=65; e.player().stateChange(2);
e.win.CourseVideo.openLesson(4); assert.equal(e.player().time,190, 'restore independent lesson position');
e.player().stateChange(1); e.player().time=216; e.tick();
assert.notEqual(e.player().state,1, 'segment end pauses');
assert.equal(JSON.parse(e.values.get(KEY)).chain,112, 'end stores start');
assert.equal(e.values.get(PROGRESS),'{"chains":3}', 'playback does not mutate course progress');
e.win.CourseVideo.openLesson(1); assert.equal(e.player().time,65);
e.player().stateChange(1); e.player().time=67; e.doc.hidden=true; e.event('document:visibilitychange');
assert.equal(e.player().state,2); assert.equal(JSON.parse(e.values.get(KEY)).knot,67);
e.win.CourseVideo.reset(); assert.equal(e.values.has(KEY),false); assert.equal(e.player().time,53);

for (const invalid of ['not-json','{"knot":"60"}','{"knot":null}','{"knot":999}','{"knot":-1}']) {
  const x=setup({initial:{[KEY]:invalid}}); x.win.CourseVideo.openLesson(1); x.click('videoLoad'); x.installPlayer(); x.player().ready(); assert.equal(x.player().time,53,invalid);
}
const broken=setup({storageThrows:true}); broken.win.CourseVideo.openLesson(1); broken.click('videoLoad'); broken.installPlayer(); broken.player().ready(); broken.click('videoRestart');
assert.match(broken.element('videoStatus').textContent,/could not be saved/);
const failed=setup(); failed.win.CourseVideo.openLesson(0); failed.click('videoLoad'); failed.installPlayer(); failed.player().error();
const playbackError=setup(); playbackError.win.CourseVideo.openLesson(0); playbackError.click('videoLoad'); playbackError.installPlayer(); playbackError.player().ready(); playbackError.player().error();
assert.equal(playbackError.element('videoLoad').hidden,false,'player error after readiness offers retry');
assert.match(failed.element('videoStatus').textContent,/Video unavailable/); assert.match(failed.element('videoTutorialLink').href,/youtube.com/);
failed.click('videoLoad'); assert.equal(failed.scripts.length,1,'retry reuses loaded API');
const slow=setup(); slow.win.CourseVideo.openLesson(0); slow.click('videoLoad'); slow.timeout();
assert.match(slow.element('videoStatus').textContent,/Video unavailable/);
console.log('PASS: video consent, lifecycle, phases, bounds, independent resume, storage and fallback.');
