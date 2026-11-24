// The original FinWise landing-page script, run against a shadow root. Returns a cleanup function.
export function initLanding(root) {
  const timers = [], offs = []
const $=s=>root.querySelector(s),$$=s=>[...root.querySelectorAll(s)],RM=matchMedia('(prefers-reduced-motion:reduce)').matches,inr=n=>'₹'+Math.round(n).toLocaleString('en-IN');
/* hero stage */
const wrap=$('.stagewrap'),stage=$('#stage'),SW=460,SH=560;
const fit=()=>stage.style.setProperty('--sc',Math.min(1,wrap.clientWidth/SW,wrap.clientHeight/SH));window.addEventListener('resize',fit);offs.push(()=>window.removeEventListener('resize',fit));fit();
const T=[25000,15000,10000],N=[5,3,2],got=[0,0,0],jars=$$('.jar');
function tween(el,a,b){if(RM){el.textContent=inr(b);return}const t0=performance.now();(function f(t){const k=Math.min(1,(t-t0)/500);el.textContent=inr(a+(b-a)*k);if(k<1)requestAnimationFrame(f)})(t0)}
function land(j){got[j]++;const jr=jars[j],fr=got[j]/N[j];jr.querySelector('.jf').style.height=fr*85+'%';tween(jr.querySelector('.amt'),T[j]*(got[j]-1)/N[j],T[j]*fr);
if(!RM){const g=jr.querySelector('.tg');[jr,g].forEach((e,i)=>{const c=i?'sw':'sq';e.classList.remove(c);void e.offsetWidth;e.classList.add(c)})}}
function coin(j,k){const r=stage.getBoundingClientRect(),sc=r.width/SW,c=$('.cloud').getBoundingClientRect(),q=jars[j].getBoundingClientRect();
const x0=(c.left+c.width/2-r.left)/sc-15+(Math.random()*70-35),y0=(c.top+c.height*.7-r.top)/sc,dx=(q.left+q.width/2-r.left)/sc-15-x0,dy=(q.top-r.top)/sc-y0;
const e=document.createElement('i');e.className='coin f f'+(j+1);e.textContent=['₹','₹','☀','☂'][k%4];e.style.left=x0+'px';e.style.top=y0+'px';stage.appendChild(e);
const T=(x,y,r)=>`translate(${x}px,${y}px) rotateY(${r}deg)`;
e.animate([{transform:T(0,0,0)},{transform:T(dx,dy-24,600),offset:.55},{transform:T(dx,dy-48,680),offset:.68},{transform:T(dx,dy+16,760),offset:.85,opacity:1},{transform:T(dx,dy+50,800),opacity:0}],{duration:1150}).onfinish=()=>{e.remove();land(j)}}
const plan=[0,1,0,2,0,1,0,2,1,0],end=()=>stage.classList.add('sunny');
function run(){if(RM){plan.forEach(land);end();return}plan.forEach((j,k)=>timers.push(setTimeout(()=>coin(j,k),600+k*380)));timers.push(setTimeout(end,600+plan.length*380+1500))}
timers.push(setTimeout(run,400));
/* phone follows the steps */
const steps=$$('.step'),ph=$('#phone'),tr=$('#track'),TL=[[-16,5],[15,-4],[-12,-7],[13,7]];let cur=-1;
function upd(){const m=innerHeight*.55;let s=0,x=0;steps.forEach((el,i)=>{const r=el.getBoundingClientRect();if(r.top<m){s=i;x=i;if(i==2&&r.top+r.height*.6<m)x=3}});
steps.forEach((el,i)=>el.classList.toggle('on',i==s));
if(x!==cur){cur=x;tr.style.transform=`translateX(${-25*x}%)`;ph.style.setProperty('--ry',TL[x][0]+'deg');ph.style.setProperty('--rx',TL[x][1]+'deg');ph.style.setProperty('--tx',TL[x][0]<0?1:-1)}}
window.addEventListener('scroll',upd,{passive:true});offs.push(()=>window.removeEventListener('scroll',upd));upd();
/* windowsill jars */
const C=[{n:'Rent & Bills',lim:18000,st:4500,c:'#8FB0FF',sh:'width:118px;height:150px;border-radius:14px 14px 34px 34px'},
{n:'Food & Dining',lim:9000,st:1500,c:'#FF7A59',sh:'width:92px;height:190px;border-radius:44px 44px 22px 22px'},
{n:'Shopping',lim:6000,st:1500,c:'#FFD84A',sh:'width:140px;height:112px;border-radius:10px 10px 50px 50px'},
{n:'Goals & Savings',lim:10000,st:2500,c:'#ffffff',sh:'width:104px;height:170px;border-radius:50% 50% 30px 30px/36% 36% 30px 30px'}];
const S=[0,0,0,0],msg=$('#msg');
$('#jars4').innerHTML=C.map((c,i)=>`<button class="cj" data-i="${i}" aria-label="Log a spend in ${c.n}"><div class="jw"><div class="gl" style="${c.sh}"><div class="fl" style="background:${c.c}"></div></div><span class="pad">${inr(c.lim)} left</span></div><span class="nm">${c.n}</span></button>`).join('');
const cj=$$('.cj');
function paint(i){const c=C[i],el=cj[i],left=c.lim-S[i];el.querySelector('.fl').style.height=S[i]/c.lim*100+'%';el.classList.toggle('locked',left<=0);el.querySelector('.pad').textContent=left<=0?'Locked':inr(left)+' left'}
cj.forEach(b=>b.onclick=()=>{const i=+b.dataset.i,c=C[i];
if(S[i]>=c.lim){msg.textContent=c.n+' is locked. In FinWise you can send an exception request, and you decide.';return}
S[i]+=c.st;
if(!RM){const g=b.querySelector('.gl'),e=document.createElement('i');e.className='coin f';e.style.cssText='left:50%;top:-30px;margin-left:-15px';e.textContent='₹';b.querySelector('.jw').appendChild(e);
e.animate([{transform:'translateY(0) rotateY(0)'},{transform:`translateY(${g.offsetHeight-20}px) rotateY(540deg)`,opacity:0}],{duration:600,easing:'ease-in'}).onfinish=()=>{e.remove();paint(i)}}else paint(i);
msg.textContent=S[i]>=c.lim?c.n+' hit its limit and the padlock snapped shut.':'Spent '+inr(c.st)+' on '+c.n+'.'});
$('#reset').onclick=()=>{S.fill(0);C.forEach((_,i)=>paint(i));msg.textContent='Jars emptied. Tap a jar.'};C.forEach((_,i)=>paint(i));
/* calculator */
const inc=$('#inc'),mo=$('#mo'),stk=$$('.stk');
function calc(){const I=+inc.value,M=+mo.value,tot=I*M,a=[tot*.5,tot*.3,tot*.2];
$('#incv').textContent=inr(I);$('#mov').textContent=M+(M>1?' months':' month');
const u=[1000,5000,10000,25000,50000,100000,250000,500000,1e6,25e5].find(x=>a[0]/x<=24)||5e6;$('#unit').textContent=inr(u);
a.forEach((v,i)=>{stk[i].innerHTML='<i class="c"></i>'.repeat(Math.max(1,Math.round(v/u)));stk[i].lastElementChild.classList.add('pop');$('#a'+i).textContent=inr(v)})}
inc.oninput=mo.oninput=calc;calc();
  return () => { timers.forEach(clearTimeout); offs.forEach((f) => f()) }
}
