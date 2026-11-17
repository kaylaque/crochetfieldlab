(() => {
  const collapsed=r=>!r.points||r.points.length<2||r.points.every(p=>p.every((v,i)=>v===r.points[0][i]));
  function layoutFrame(frame,view){
    const width=view.width||1,height=view.height||1,scale=Math.max(1,Math.min(height*.22,(width-48)/6))*(view.zoom||1);
    const project=p=>{const x=view.mode==='side'?p[2]:p[0];return [width/2+(view.mirror?-x:x)*scale+(view.panX||0),height*.55-p[1]*scale+(view.panY||0)];};
    const handles=[];
    for(const region of Object.values(frame.regions||{}))if(region.active&&!collapsed(region))region.points.forEach((p,index)=>{
      const [x,y]=project(p);
      if(x>=0&&x<=width&&y>=0&&y<=height)handles.push({regionId:region.id,index,x,y,selected:view.selected?.regionId===region.id&&view.selected?.index===index});
    });
    const [hx,hy]=project(frame.hook.position),angle=view.mode==='side'?frame.hook.orientation[0]:frame.hook.orientation[2],s=frame.hook.scale||.7;
    const local=(x,y)=>{
      const horizontal=(view.mode==='side'?frame.hook.position[2]:frame.hook.position[0])+s*(x*Math.cos(angle)-y*Math.sin(angle));
      const vertical=frame.hook.position[1]+s*(x*Math.sin(angle)+y*Math.cos(angle));
      return view.mode==='side'?[frame.hook.position[0],vertical,horizontal]:[horizontal,vertical,frame.hook.position[2]];
    };
    const [tx,ty]=project(local(.9,.23));
    const shaft=Array.from({length:31},(_,i)=>{const t=i/30;return project(local(-1.7+2.6*t,.12+t*.12));});
    const tip=Array.from({length:25},(_,i)=>{const t=i/24;return project(local(.9+.11*Math.sin(Math.PI*t)+.2*t,.23+.25*Math.sin(Math.PI*t)-.19*t));});
    const foundation=Array.from({length:7},(_,i)=>{const x=(i-3)*.44,z=.1+(i%2)*.12;return [[x-.22,-.14,z+.04],[x,-.4,z],[x+.22,-.14,z+.04]].map(project);});
    return {handles,foundation,hook:{x:hx,y:hy,throat:{x:tx,y:ty},path:[shaft,tip]},project};
  }
  function drawScene(ctx,frame,view){
    const layout=layoutFrame(frame,view),w=view.width||1,h=view.height||1;
    ctx.clearRect(0,0,w,h);
    if(ctx.createLinearGradient){
      const bg=ctx.createLinearGradient(0,0,w,h);
      bg.addColorStop(0,'#e6ecfb');bg.addColorStop(1,'#f6e8f1');
      ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    }
    const path=(pts,color,width)=>{
      if(window.StitchDraw)window.StitchDraw.strokePath(ctx,pts,color,width);
      else{
        if(!pts.length)return;
        ctx.beginPath();ctx.moveTo(...pts[0]);
        for(let i=1;i<pts.length;i++)ctx.lineTo(...pts[i]);
        ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.stroke();
      }
    };
    for(const points of layout.foundation){path(points,'#3b3355',7);path(points,'#ec9cad',4);}
    path(layout.foundation[5],'#e6a900',2.5);
    if(view.ghostFrame){
      ctx.save();ctx.globalAlpha=.24;
      for(const r of Object.values(view.ghostFrame.regions||{}))if(r.active&&!collapsed(r))path(r.points.map(layout.project),'#7457c5',3);
      ctx.restore();
    }
    for(const hp of layout.hook.path){path(hp,'#3b3355',7);path(hp,'#c9ddf5',4);}
    for(const r of Object.values(frame.regions||{}))if(r.active&&!collapsed(r)){
      const pts=r.points.map(layout.project);
      path(pts,'#3b3355',6);path(pts,'#ec9cad',3);
    }
    ctx.beginPath();ctx.arc(layout.hook.throat.x,layout.hook.throat.y,5,0,Math.PI*2);
    ctx.fillStyle='#2255aa';ctx.fill();
    for(const handle of layout.handles){
      const radius=handle.selected?6:1.5;
      ctx.beginPath();ctx.arc(handle.x,handle.y,radius,0,Math.PI*2);
      ctx.fillStyle=handle.selected?'#2455b4':'rgba(255,255,255,.8)';ctx.fill();
      ctx.strokeStyle='#3b3355';ctx.lineWidth=handle.selected?1.5:.75;ctx.stroke();
    }
    if(ctx.fillText){
      const captionBoxes=[];
      const caption=(text,point,dx,dy)=>{
        const width=text.length*7+12;
        const x=Math.max(6,Math.min(w-width-6,point[0]+dx));
        let y=Math.max(20,Math.min(h-8,point[1]+dy));
        for(const offset of [0,22,-22,44,-44,66,-66,88,-88]){
          const candidate=Math.max(20,Math.min(h-8,y+offset));
          if(captionBoxes.every(box=>x+width<=box.x||box.x+box.width<=x||candidate+5<=box.y||box.y+20<=candidate-15)){
            y=candidate;break;
          }
        }
        captionBoxes.push({x,y:y-15,width});
        ctx.save();
        ctx.beginPath();ctx.moveTo(...point);ctx.lineTo(x+6,y-6);
        ctx.strokeStyle='#615775';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle='rgba(255,251,254,.94)';ctx.fillRect(x-3,y-15,width,20);
        ctx.fillStyle='#302943';ctx.font='600 12px system-ui,sans-serif';
        ctx.fillText(text,x+3,y);ctx.restore();
      };
      caption('Second chain V',layout.project([.88,-.28,.22]),-55,42);
      const yarn=frame.regions?.workingYarn;
      if(yarn?.active)caption('Working yarn',layout.project(yarn.points[3]),-45,-32);
      const first=frame.regions?.firstLoop,newLoop=frame.regions?.newLoop;
      if(first?.active)caption(newLoop?.active&&!collapsed(newLoop)?'Loop 1':'Loop on hook',layout.project(first.points[5]),-95,-24);
      if(newLoop?.active&&!collapsed(newLoop))caption('Loop 2',layout.project(newLoop.points[5]),15,36);
    }
    return layout;
  }
  window.StitchCanvas={layoutFrame,drawScene};
})();
