const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const elements = new Map(), events = {}, calls = [];
function element(id) {
  if (!elements.has(id)) elements.set(id, {
    id, hidden:false, disabled:false, textContent:'', value:'', children:[], style:{},
    classList:{toggle(){},add(){},remove(){}},
    addEventListener(type, fn){events[id+':'+type]=fn;},
    append(...children){this.children.push(...children);}, replaceChildren(...children){this.children=children;},
    setAttribute(){}, focus(){}
  });
  return elements.get(id);
}
const document = {
  hidden:false, getElementById:element,
  createElement(){return element('created-'+Math.random());},
  createTextNode(text){return {textContent:text};},
  querySelector(){return {checked:true, value:'right'};},
  addEventListener(type,fn){events['document:'+type]=fn;}
};
const store = new Map();
const sandbox = vm.createContext({document, window:{CourseVideo:{init(){calls.push('init');},openLesson(i){calls.push(i);},pause(){calls.push('pause');}},scrollTo(){}},location:{href:'http://localhost/workshop.html',search:''},URL,
  localStorage:{getItem(k){return store.get(k)??null;},setItem(k,v){store.set(k,v);},removeItem(k){store.delete(k);}},
  fetch:()=>new Promise(()=>{}), navigator:{}, requestAnimationFrame(){},cancelAnimationFrame(){}, performance:{now:()=>0},console,confirm:()=>true});
vm.runInContext(fs.readFileSync('workshop.js','utf8'),sandbox,{filename:'workshop.js'});
// Last level cleared -> LANJUT opens the finish screen, not the game.
vm.runInContext('player.name="Qib";player.level=5;levelUp()',sandbox);
assert.equal(vm.runInContext('player.level',sandbox),6,'level counter passes the last level');
events['levelUpButton:click']();
assert.equal(element('finishScreen').hidden,false,'finish screen is shown after the last level');
assert.equal(element('gameScreen').hidden,true,'game screen is hidden on finish');
assert.equal(element('finishName').textContent,'QIB','finish screen greets the player');
// Replay resets progress and returns to the game.
events['replayButton:click']();
assert.equal(vm.runInContext('player.level',sandbox),0,'replay restarts from level 0');
assert.equal(element('finishScreen').hidden,true);
assert.equal(element('gameScreen').hidden,false,'replay returns to the game');
const saved=JSON.parse(store.get('crochetpy-workshop-v1'));
assert.equal(saved.level,0,'replay is saved');
console.log('PASS: finish screen after last level, replay resets progress.');
