// Simuloi ihanteelliset Hohmannin siirrot kuhunkin kohteeseen: npm run sim
// Hyödyllinen, kun virität physics/systems.ts:n arvoja.
import { getSystem } from "../src/physics/systems";
import { setupBodies, step, bodyPos, bodyVel, gravity } from "../src/physics/orbital";
function run(sysId:"sun"|"earth", target:string, dv:number, r1:number){
  const sys=getSystem(sysId); const th=0.3;
  const bodies=setupBodies(sys,target,th,r1,()=>0.5,true);
  const v=Math.sqrt(sys.central.mu/r1);
  const s={x:r1*Math.cos(th),y:r1*Math.sin(th),vx:-v*Math.sin(th),vy:v*Math.cos(th)};
  const sp=Math.hypot(s.vx,s.vy); s.vx*= (sp+dv)/sp; s.vy*=(sp+dv)/sp;
  const tb=bodies.find(b=>b.id===target)!;
  let best={d:1e9,t:0,rel:0}; const h=1/120;
  for(let t=0;t<800;t+=h){ step(sys,bodies,s,t,h,{x:0,y:0});
    const p=bodyPos(tb,t+h); const d=Math.hypot(s.x-p.x,s.y-p.y);
    if(d<best.d){const bv=bodyVel(tb,t+h); best={d,t,rel:Math.hypot(s.vx-bv.x,s.vy-bv.y)}}
    if(d<tb.capR) {const bv=bodyVel(tb,t+h);console.log(target,'CAPTURE ZONE at t',t.toFixed(1),'rel',Math.hypot(s.vx-bv.x,s.vy-bv.y).toFixed(2),'cap',sys.vCapture);return;}
    if(Math.hypot(s.x,s.y)<sys.central.radius){console.log('impact');return}
  }
  console.log(target,'closest',best);
}
run("sun","mars",1.03,100); run("sun","ceres",2.22,100); run("sun","jupiter",3.09,100); run("sun","saturn",3.61,100); run("sun","wormhole",2.77,100);
run("earth","moon",3.66,20);
