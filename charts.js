// Two small charts, drawn as SVG with no library: stacked blocks on a grid seen slightly from above (the month
// calendar and the weekly columns), and a meter of this month's food spending against the usual.
// One colour language everywhere: --home (cooked at home, groceries) and --out (takeaway); grey is nothing.
const NS='http://www.w3.org/2000/svg';
const rad=d=>d*Math.PI/180;
const svgEl=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;

// An axonometric view: turn the grid by theta around the vertical axis, look down at phi.
function view(theta,phi){
  const c=Math.cos(rad(theta)),s=Math.sin(rad(theta)),sp=Math.sin(rad(phi)),cp=Math.cos(rad(phi));
  return (X,Y,Z)=>[X*c-Y*s,(X*s+Y*c)*sp-Z*cp];
}
const pts=list=>list.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

// Where every face lands for one angle: cells far to near, each with its floor tile and its slabs (top, front, side).
function layout(cells,{cell,inset,gap,angle,phi,grow=1}){
  const p=view(angle,phi),c=Math.cos(rad(angle)),s=Math.sin(rad(angle));
  return cells.map((cl,i)=>[i,(cl.col+.5)*s+(cl.row+.5)*c]).sort((a,b)=>a[1]-b[1]).map(([i])=>{
    const cl=cells[i],x0=cl.col*cell+inset,y0=cl.row*cell+inset,x1=(cl.col+1)*cell-inset,y1=(cl.row+1)*cell-inset;let z=0;
    const slabs=cl.segments.map(sg=>{const z0=z,z1=z+sg.h*grow;z=z1+gap*grow;
      return {kind:sg.kind,t:[p(x0,y0,z1),p(x1,y0,z1),p(x1,y1,z1),p(x0,y1,z1)],f:[p(x0,y1,z0),p(x1,y1,z0),p(x1,y1,z1),p(x0,y1,z1)],r:[p(x1,y0,z0),p(x1,y1,z0),p(x1,y1,z1),p(x1,y0,z1)]};});
    return {i,tile:[p(x0,y0,0),p(x1,y0,0),p(x1,y1,0),p(x0,y1,0)],slabs,top:p((x0+x1)/2,(y0+y1)/2,Math.max(z,1)),base:p((x0+x1)/2,(y0+y1)/2,0)};
  });
}
// A frame fitted to the real blocks at every angle in the range, so turning never rescales the picture.
function fit(cells,{cols,rows,cell,gap,phi,range}){
  const corners=[];for(const c of cells){const z=c.segments.reduce((a,s)=>a+s.h+gap,0);for(const X of [c.col*cell,(c.col+1)*cell])for(const Y of [c.row*cell,(c.row+1)*cell])for(const Z of [0,z])corners.push([X,Y,Z]);}
  if(!corners.length)corners.push([0,0,0],[cols*cell,rows*cell,0]);
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
  for(let t=range[0];t<=range[1];t+=2){const p=view(t,phi);for(const c of corners){const [x,y]=p(...c);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}}
  return {x:minX,y:minY,w:maxX-minX,h:maxY-minY};
}

/**
 * Blocks on a grid. cells: [{col,row,segments:[{kind:'home'|'out',h}],today,ahead,tip:{title,lines}}].
 * Each segment is a slab h units tall; slabs in a stack are separated by a small gap so they can be counted.
 * Returns {destroy}. Drag sideways to turn it a little; tap a block for its details.
 */
export function blocks(host,{cols,rows,cells,cell=40,inset=4,gap=2.2,theta=34,phi=40,range=[16,56],rise=true,label=''}){
  host.replaceChildren();host.classList.add('blocks');
  const svg=svgEl('svg',{role:'img','aria-label':label});svg.style.touchAction='pan-y';
  const tip=document.createElement('div');tip.className='chart-tip';tip.hidden=true;
  host.append(svg,tip);
  const box=fit(cells,{cols,rows,cell,gap,phi,range}),pad=6;
  svg.setAttribute('viewBox',`${(box.x-pad).toFixed(1)} ${(box.y-pad).toFixed(1)} ${(box.w+pad*2).toFixed(1)} ${(box.h+pad*2).toFixed(1)}`);
  // One group per cell, faces created once and reshaped on every frame.
  const groups=cells.map((c,i)=>{
    const g=svgEl('g',{'data-i':i,class:'cell'+(c.today?' is-today':'')+(c.ahead?' is-ahead':'')});
    g.append(svgEl('polygon',{class:'tile'}));
    c.faces=c.segments.map(s=>{const t=svgEl('polygon',{class:`t-${s.kind}`}),f=svgEl('polygon',{class:`f-${s.kind}`}),r=svgEl('polygon',{class:`r-${s.kind}`});g.append(f,r,t);return {t,f,r};});
    g.append(svgEl('rect',{class:'hit',fill:'transparent'}));   // a generous tap target over the whole column
    return g;
  });
  let angle=theta,grow=rise&&!reduced()?0:1,frame=0;
  function draw(){
    for(const {i,tile,slabs,top,base} of layout(cells,{cell,inset,gap,angle,phi,grow})){
      const cl=cells[i],g=groups[i],w=cell*1.05;
      g.firstChild.setAttribute('points',pts(tile));
      slabs.forEach((sl,k)=>{const face=cl.faces[k];face.t.setAttribute('points',pts(sl.t));face.f.setAttribute('points',pts(sl.f));face.r.setAttribute('points',pts(sl.r));});
      const hit=g.lastChild;hit.setAttribute('x',(top[0]-w/2).toFixed(1));hit.setAttribute('y',(top[1]-w*.35).toFixed(1));hit.setAttribute('width',w.toFixed(1));hit.setAttribute('height',(base[1]-top[1]+w*.6).toFixed(1));
      cl.anchor=top;svg.append(g);   // far to near
    }
  }
  draw();
  if(grow<1){const start=performance.now();const tick=now=>{const k=Math.min(1,(now-start)/650);grow=1-(1-k)**3;draw();if(k<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);}
  // Turning and tapping.
  let down=null;
  const showTip=i=>{
    const cl=cells[i];if(!cl?.tip){tip.hidden=true;return;}
    tip.replaceChildren();const t=document.createElement('strong');t.textContent=cl.tip.title;tip.append(t);
    for(const line of cl.tip.lines){const d=document.createElement('span');d.textContent=line;tip.append(d);}
    tip.hidden=false;
    const box=svg.getBoundingClientRect(),hb=host.getBoundingClientRect(),vb=svg.viewBox.baseVal,k=box.width/vb.width;
    const x=(cl.anchor[0]-vb.x)*k+box.left-hb.left,y=(cl.anchor[1]-vb.y)*k+box.top-hb.top;
    tip.style.left=`${Math.max(6,Math.min(hb.width-tip.offsetWidth-6,x-tip.offsetWidth/2))}px`;tip.style.top=`${Math.max(0,y-tip.offsetHeight-10)}px`;
    for(const g of groups)g.classList.toggle('is-picked',g===groups[i]);
  };
  const hide=()=>{tip.hidden=true;for(const g of groups)g.classList.remove('is-picked');};
  svg.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,angle,g:e.target.closest('g[data-i]')};});
  const move=e=>{if(!down)return;const dx=e.clientX-down.x;if(Math.abs(dx)>6&&!reduced()){hide();angle=Math.max(range[0],Math.min(range[1],down.angle-dx*.25));cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);}};
  const up=e=>{if(!down)return;const moved=Math.hypot(e.clientX-down.x,e.clientY-down.y);const g=down.g;down=null;if(moved<8){if(g&&!(g.classList.contains('is-picked')))showTip(Number(g.dataset.i));else hide();}};
  window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',()=>{down=null;});
  const outside=e=>{if(!host.contains(e.target))hide();};document.addEventListener('pointerdown',outside);
  return {destroy(){cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);document.removeEventListener('pointerdown',outside);}};
}

/**
 * The same blocks painted on a canvas (for a picture to share), fitted into {x,y,width}. colours: {tile,ahead,home,out},
 * each kind as {t,f,r} for its top, front and side. Returns the height used.
 */
export function paintBlocks(ctx,{cols,rows,cells,cell=40,inset=4,gap=2.2,theta=34,phi=40,x,y,width,colours}){
  const box=fit(cells,{cols,rows,cell,gap,phi,range:[theta,theta]}),k=width/box.w;
  const at=([px,py])=>[x+(px-box.x)*k,y+(py-box.y)*k];
  const poly=(list,fill,stroke)=>{ctx.beginPath();list.map(at).forEach(([px,py],n)=>n?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.closePath();
    if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}};
  for(const {i,tile,slabs} of layout(cells,{cell,inset,gap,angle:theta,phi})){
    if(cells[i].ahead)poly(tile,null,colours.ahead);else poly(tile,colours.tile);
    for(const sl of slabs){const c=colours[sl.kind];poly(sl.f,c.f);poly(sl.r,c.r);poly(sl.t,c.t);}
  }
  return box.h*k;
}

/**
 * This month's food spending as one slab against the usual: the outlined slab is what you would usually have spent
 * by now; the filled parts are what you did spend (groceries, takeaway); the empty remainder is what you kept.
 */
export function spendingMeter(host,{usual,parts,label=''}){
  host.replaceChildren();host.classList.add('meter');
  const spent=parts.reduce((a,p)=>a+p.value,0),scale=Math.max(usual,spent,1),W=300,H=14,D=5,gapPx=2;
  const svg=svgEl('svg',{viewBox:`0 ${-D-1} ${W+D+1} ${H+D+2}`,role:'img','aria-label':label});
  const slab=(x,w,kind)=>{   // a front face, a top face and an end face: a bar seen slightly from above
    if(w<=0)return;const g=svgEl('g');
    g.append(svgEl('polygon',{class:`t-${kind}`,points:pts([[x,0],[x+w,0],[x+w+D,-D],[x+D,-D]])}),
             svgEl('polygon',{class:`r-${kind}`,points:pts([[x+w,0],[x+w+D,-D],[x+w+D,H-D],[x+w,H]])}),
             svgEl('rect',{class:`f-${kind}`,x:x.toFixed(1),y:0,width:w.toFixed(1),height:H}));
    svg.append(g);
  };
  const trackW=usual/scale*W;
  if(usual>0){const g=svgEl('g',{class:'track'});g.append(svgEl('polygon',{points:pts([[0,0],[trackW,0],[trackW+D,-D],[D,-D]])}),svgEl('polygon',{points:pts([[trackW,0],[trackW+D,-D],[trackW+D,H-D],[trackW,H]])}),svgEl('rect',{x:0,y:0,width:trackW.toFixed(1),height:H}));svg.append(g);}
  let x=0;const filled=parts.filter(p=>p.value>0);
  filled.forEach((p,i)=>{const w=p.value/scale*W-(i<filled.length-1?gapPx:0);slab(x,Math.max(0,w),p.kind);x+=p.value/scale*W;});
  host.append(svg);
}
