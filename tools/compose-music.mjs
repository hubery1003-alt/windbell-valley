import fs from 'node:fs';
const dir = new URL('../assets/', import.meta.url);
const SR=22050, eighth=60/78/2, bar=eighth*6, duration=bar*32;
const count=Math.ceil(SR*duration), L=new Float32Array(count), R=new Float32Array(count);
const freq=n=>440*2**((n-69)/12);
let seed=71284; function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function note(midi,start,len,amp,type='piano',pan=0){
 const f=freq(midi), begin=Math.round(start*SR), end=Math.min(count,begin+Math.ceil((len+1.4)*SR));
 const pl=Math.sqrt((1-pan)/2),pr=Math.sqrt((1+pan)/2);
 for(let i=begin;i<end;i++) {const t=(i-begin)/SR;let v=0;
  if(type==='piano'){const env=(1-Math.exp(-t*120))*Math.exp(-t*2.1)*(t<len+1.3?1:0);v=env*(Math.sin(2*Math.PI*f*t)*.68+Math.sin(2*Math.PI*f*2.002*t)*.18*Math.exp(-t*3)+Math.sin(2*Math.PI*f*3.006*t)*.09*Math.exp(-t*5)+Math.sin(2*Math.PI*f*4.01*t)*.04*Math.exp(-t*6));}
  else if(type==='flute'){const env=Math.min(1,t/.16)*Math.max(0,Math.min(1,(len+.18-t)/.25));const phase=2*Math.PI*f*t+.026*Math.sin(2*Math.PI*4.5*t);v=env*(Math.sin(phase)*.9+Math.sin(phase*2)*.08+Math.sin(phase*3)*.02+(rand()-.5)*.025);}
  else if(type==='bell'){v=(1-Math.exp(-t*180))*Math.exp(-t*1.15)*(Math.sin(2*Math.PI*f*t)+.28*Math.sin(2*Math.PI*f*2.76*t)+.1*Math.sin(2*Math.PI*f*5.4*t));}
  else {const env=Math.min(1,t/.6)*Math.max(0,Math.min(1,(len+.8-t)/.8));v=env*(Math.sin(2*Math.PI*f*t)*.7+Math.sin(2*Math.PI*f*1.002*t)*.25+Math.sin(2*Math.PI*f*2*t)*.05);}
  L[i]+=v*amp*pl;R[i]+=v*amp*pr;
 }
}
const chords=[[55,59,62],[52,55,59],[48,52,55],[50,54,57],[55,59,62],[47,50,54],[48,52,55],[50,54,57], [52,55,59],[48,52,55],[55,59,62],[50,54,57],[48,52,55],[50,54,57],[55,59,62],[55,59,62]];
const melody=[[79,81,83],[86,83],[83,81,79],[78,81], [79,83,86],[83,81],[79,76,79],[81,78], [83,86,88],[86,83],[81,79,83],[81,78], [79,81,83],[81,78],[79,74,79],[79]];
for(let b=0;b<32;b++){
 const c=chords[b%16],base=b*bar;
 note(c[0]-12,base,bar*.8,.065,'pad',-.12);
 for(let j=0;j<6;j++){const n=c[[0,1,2,1,2,1][j]]+(j?12:0);note(n,base+j*eighth,.7,.13,'piano',j%2?.28:-.28);}
 const m=melody[b%16],len=bar/m.length;
 for(let j=0;j<m.length;j++)note(m[j],base+j*len+.06,len*.76,b<16?.115:.09,'flute',.08);
 if(b%4===0)note(c[2]+24,base+.15,2,.048,'bell',.5);
 if(b>=16&&b%2===1)note(c[1]+24,base+3*eighth,.8,.037,'piano',-.5);
}
// A short stereo room response, mixed before limiting. All source notes are original.
for(const [delay,gain] of [[.073,.14],[.137,.1],[.241,.065],[.389,.04]]){const d=Math.round(delay*SR);for(let i=count-1;i>=d;i--){L[i]+=R[i-d]*gain;R[i]+=L[i-d]*gain;}}
let max=0;for(let i=0;i<count;i++)max=Math.max(max,Math.abs(L[i]),Math.abs(R[i]));
for(let i=0;i<count;i++){const t=i/SR,fade=Math.min(1,t/1.6,(duration-t)/2.2);L[i]*=fade*.78/max;R[i]*=fade*.78/max;}
function wav(path,left,right){const N=left.length,out=Buffer.alloc(44+N*4);out.write('RIFF',0);out.writeUInt32LE(out.length-8,4);out.write('WAVEfmt ',8);out.writeUInt32LE(16,16);out.writeUInt16LE(1,20);out.writeUInt16LE(2,22);out.writeUInt32LE(SR,24);out.writeUInt32LE(SR*4,28);out.writeUInt16LE(4,32);out.writeUInt16LE(16,34);out.write('data',36);out.writeUInt32LE(N*4,40);for(let i=0;i<N;i++){out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,left[i]))*32767),44+i*4);out.writeInt16LE(Math.round(Math.max(-1,Math.min(1,right[i]))*32767),46+i*4);}fs.writeFileSync(path,out);}
wav(new URL('windbell-valley.wav',dir),L,R);
const al=new Float32Array(SR*16),ar=new Float32Array(SR*16);let slow=0;
for(let i=0;i<al.length;i++){const t=i/SR;slow=slow*.93+(rand()-.5)*.07;const flow=slow*(.7+.2*Math.sin(t*.8))+(rand()-.5)*.027;const fade=Math.min(1,t/.3,(16-t)/.3);al[i]=flow*fade;ar[i]=(flow*.8+Math.sin(t*2900)*.0005)*fade;}
wav(new URL('creek.wav',dir),al,ar);
fs.writeFileSync(new URL('music-score.json',dir),JSON.stringify({title:'风经过茶屋 / A Breeze at the Teahouse',composer:'Original procedural composition for Windbell Valley',duration,tempo:78,meter:'6/8',key:'G major',instruments:['additive felt piano','soft flute','warm sine strings','inharmonic glass bells'],chords,melody},null,2));
console.log(JSON.stringify({duration,peak:max,files:['windbell-valley.wav','creek.wav']}));
