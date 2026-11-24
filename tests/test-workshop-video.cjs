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
const sandbox = vm.createContext({document, window:{CourseVideo:{init(){calls.push('init');},openLesson(i){calls.push(i);},pause(){calls.push('pause');}},scrollTo(){}},
  localStorage:{getItem(k){return store.get(k)??null;},setItem(k,v){store.set(k,v);},removeItem(k){store.delete(k);}},
  fetch:()=>new Promise(()=>{}), navigator:{}, requestAnimationFrame(){},cancelAnimationFrame(){}, performance:{now:()=>0},console,confirm:()=>true});
vm.runInContext(fs.readFileSync('workshop.js','utf8'),sandbox,{filename:'workshop.js'});
assert.deepEqual(calls,['init'],'video is initialized once');
vm.runInContext('renderLevels()',sandbox);
assert.equal(element('workshopVideoControls').hidden,false,'preparation video is available from the first level');
assert.equal(calls.at(-1),0,'first level opens the materials tutorial');
for(const [level,video] of [[1,2],[2,1],[3,3],[4,4],[5,5]]){
  vm.runInContext(`player.level=${level};renderLevels()`,sandbox);
  assert.equal(calls.at(-1),video,`level ${level} opens the matching lesson`);
  assert.equal(element('workshopVideoControls').hidden,false);
}
const before=calls.length;
vm.runInContext('renderLevels()',sandbox);
assert.equal(calls.length,before,'ordinary renders do not reopen video');
vm.runInContext('showJournal()',sandbox); assert.equal(calls.at(-1),'pause','journal pauses video');
vm.runInContext('player.level=0;renderLevels()',sandbox);
assert.equal(calls.at(-1),0,'returning to the first level restores the materials tutorial');
assert.equal(element('workshopVideoControls').hidden,false);
console.log('PASS: workshop level video mapping and journal pause.');
