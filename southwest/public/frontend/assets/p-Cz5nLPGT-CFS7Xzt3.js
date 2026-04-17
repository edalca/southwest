import{aD as m,aE as w,aF as b}from"./index-MnoPoS4P.js";/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */const y=(o,p,X,f,g)=>{const i=o.ownerDocument.defaultView;let a=m(o);const l=t=>a?-t.deltaX:t.deltaX;return w({el:o,gestureName:"goback-swipe",gesturePriority:101,threshold:10,canStart:t=>(a=m(o),(e=>{const{startX:n}=e;return a?n>=i.innerWidth-50:n<=50})(t)&&p()),onStart:X,onMove:t=>{const e=l(t);f(e/i.innerWidth)},onEnd:t=>{const e=l(t),n=i.innerWidth,r=e/n,c=(s=>a?-s.velocityX:s.velocityX)(t),d=c>=0&&(c>.2||e>n/2),h=(d?1-r:r)*n;let u=0;if(h>5){const s=h/Math.abs(c);u=Math.min(s,540)}g(d,r<=0?.01:b(0,r,.9999),u)}})};export{y as createSwipeBackGesture};
//# sourceMappingURL=p-Cz5nLPGT-CFS7Xzt3.js.map
