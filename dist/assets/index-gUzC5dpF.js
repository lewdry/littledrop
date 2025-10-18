(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))n(r);new MutationObserver(r=>{for(const s of r)if(s.type==="childList")for(const o of s.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function i(r){const s={};return r.integrity&&(s.integrity=r.integrity),r.referrerPolicy&&(s.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?s.credentials="include":r.crossOrigin==="anonymous"?s.credentials="omit":s.credentials="same-origin",s}function n(r){if(r.ep)return;r.ep=!0;const s=i(r);fetch(r.href,s)}})();const Ut=!1;var Xt=Array.isArray,ye=Array.prototype.indexOf,ve=Array.from,Et=Object.defineProperty,et=Object.getOwnPropertyDescriptor,ge=Object.prototype,_e=Array.prototype,me=Object.getPrototypeOf,It=Object.isExtensible;const we=()=>{};function be(t){for(var e=0;e<t.length;e++)t[e]()}function xe(){var t,e,i=new Promise((n,r)=>{t=n,e=r});return{promise:i,resolve:t,reject:e}}const M=2,Ht=4,Ee=8,j=16,z=32,V=64,At=128,P=256,ht=512,m=1024,S=2048,Y=4096,J=8192,st=16384,jt=32768,zt=65536,Bt=1<<17,ke=1<<18,mt=1<<19,Te=1<<20,kt=1<<21,Ct=1<<22,pt=1<<23,xt=Symbol("$state"),Vt=new class extends Error{name="StaleReactionError";message="The reaction that called `getAbortSignal()` was re-run or destroyed"},Me=11;function Ae(){throw new Error("https://svelte.dev/e/effect_update_depth_exceeded")}function Ce(){throw new Error("https://svelte.dev/e/state_descriptors_fixed")}function Se(){throw new Error("https://svelte.dev/e/state_prototype_fixed")}function Fe(){throw new Error("https://svelte.dev/e/state_unsafe_mutation")}function Re(){throw new Error("https://svelte.dev/e/svelte_boundary_reset_onerror")}const Pe=2,_=Symbol();function Ie(){console.warn("https://svelte.dev/e/svelte_boundary_reset_noop")}function Be(t){return t===this.v}let St=!1,De=!1;function Ne(){St=!0}let F=null;function yt(t){F=t}function Oe(t,e=!1,i){F={p:F,c:null,e:null,s:t,x:null,l:St&&!e?{s:null,u:null,$:[]}:null}}function Le(t){var e=F,i=e.e;if(i!==null){e.e=null;for(var n of i)ti(n)}return F=e.p,{}}function wt(){return!St||F!==null&&F.l===null}let K=[];function We(){var t=K;K=[],be(t)}function vt(t){if(K.length===0){var e=K;queueMicrotask(()=>{e===K&&We()})}K.push(t)}const Ye=new WeakMap;function Gt(t){var e=v;if(e===null)return y.f|=pt,t;if((e.f&jt)===0){if((e.f&At)===0)throw!e.parent&&t instanceof Error&&Kt(t),t;e.b.error(t)}else gt(t,e)}function gt(t,e){for(;e!==null;){if((e.f&At)!==0)try{e.b.error(t);return}catch(i){t=i}e=e.parent}throw t instanceof Error&&Kt(t),t}function Kt(t){const e=Ye.get(t);e&&(Et(t,"message",{value:e.message}),Et(t,"stack",{value:e.stack}))}const ft=new Set;let w=null,Tt=new Set,N=[],Ft=null,Mt=!1;class k{current=new Map;#n=new Map;#i=new Set;#d=0;#s=null;#l=[];#r=[];#e=[];#t=[];#o=[];#c=[];skipped_effects=new Set;process(e){N=[];var i=k.apply(this);for(const s of e)this.#f(s);if(this.#d===0){this.#u();var n=this.#r,r=this.#e;this.#r=[],this.#e=[],this.#t=[],w=null,Dt(n),Dt(r),this.#s?.resolve()}else this.#a(this.#r),this.#a(this.#e),this.#a(this.#t);i();for(const s of this.#l)rt(s);this.#l=[]}#f(e){e.f^=m;for(var i=e.first;i!==null;){var n=i.f,r=(n&(z|V))!==0,s=r&&(n&m)!==0,o=s||(n&J)!==0||this.skipped_effects.has(i);if(!o&&i.fn!==null){r?i.f^=m:(n&Ht)!==0?this.#e.push(i):(n&m)===0&&((n&Ct)!==0&&i.b?.is_pending()?this.#l.push(i):bt(i)&&((i.f&j)!==0&&this.#t.push(i),rt(i)));var l=i.first;if(l!==null){i=l;continue}}var a=i.parent;for(i=i.next;i===null&&a!==null;)i=a.next,a=a.parent}}#a(e){for(const i of e)((i.f&S)!==0?this.#o:this.#c).push(i),x(i,m);e.length=0}capture(e,i){this.#n.has(e)||this.#n.set(e,i),this.current.set(e,e.v)}activate(){w=this}deactivate(){w=null}flush(){if(N.length>0){if(this.activate(),qe(),w!==null&&w!==this)return}else this.#d===0&&this.#u();this.deactivate();for(const e of Tt)if(Tt.delete(e),e(),w!==null)break}#u(){for(const e of this.#i)e();if(this.#i.clear(),ft.size>1){this.#n.clear();let e=!0;for(const i of ft){if(i===this){e=!1;continue}for(const[n,r]of this.current){if(i.current.has(n))if(e)i.current.set(n,r);else continue;$t(n)}if(N.length>0){w=i;const n=k.apply(i);for(const r of N)i.#f(r);N=[],n()}}w=null}ft.delete(this)}increment(){this.#d+=1}decrement(){this.#d-=1;for(const e of this.#o)x(e,S),Q(e);for(const e of this.#c)x(e,Y),Q(e);this.flush()}add_callback(e){this.#i.add(e)}settled(){return(this.#s??=xe()).promise}static ensure(){if(w===null){const e=w=new k;ft.add(w),k.enqueue(()=>{w===e&&e.flush()})}return w}static enqueue(e){vt(e)}static apply(e){return we}}function qe(){var t=Z;Mt=!0;try{var e=0;for(Ot(!0);N.length>0;){var i=k.ensure();if(e++>1e3){var n,r;Ue()}i.process(N),L.clear()}}finally{Mt=!1,Ot(t),Ft=null}}function Ue(){try{Ae()}catch(t){gt(t,Ft)}}let X=null;function Dt(t){var e=t.length;if(e!==0){for(var i=0;i<e;){var n=t[i++];if((n.f&(st|J))===0&&bt(n)&&(X=[],rt(n),n.deps===null&&n.first===null&&n.nodes_start===null&&(n.teardown===null&&n.ac===null?le(n):n.fn=null),X?.length>0)){L.clear();for(const r of X)rt(r);X=[]}}X=null}}function $t(t){if(t.reactions!==null)for(const e of t.reactions){const i=e.f;(i&M)!==0?$t(e):(i&(Ct|j))!==0&&(x(e,S),Q(e))}}function Q(t){for(var e=Ft=t;e.parent!==null;){e=e.parent;var i=e.f;if(Mt&&e===v&&(i&j)!==0)return;if((i&(V|z))!==0){if((i&m)===0)return;e.f^=m}}N.push(e)}function Xe(t){let e=0,i=Pt(0),n;return()=>{Qe()&&($(i),ii(()=>(e===0&&(n=fi(()=>t(()=>it(i)))),e+=1,()=>{vt(()=>{e-=1,e===0&&(n?.(),n=void 0,it(i))})})))}}var He=zt|mt|At;function je(t,e,i){new ze(t,e,i)}class ze{parent;#n=!1;#i;#d=null;#s;#l;#r;#e=null;#t=null;#o=null;#c=null;#f=0;#a=0;#u=!1;#h=null;#g=()=>{this.#h&&Qt(this.#h,this.#f)};#_=Xe(()=>(this.#h=Pt(this.#f),()=>{this.#h=null}));constructor(e,i,n){this.#i=e,this.#s=i,this.#l=n,this.parent=v.b,this.#n=!!this.#s.pending,this.#r=ni(()=>{v.b=this;{try{this.#e=q(()=>n(this.#i))}catch(r){this.error(r)}this.#a>0?this.#y():this.#n=!1}},He)}#m(){try{this.#e=q(()=>this.#l(this.#i))}catch(e){this.error(e)}this.#n=!1}#w(){const e=this.#s.pending;e&&(this.#t=q(()=>e(this.#i)),k.enqueue(()=>{this.#e=this.#p(()=>(k.ensure(),q(()=>this.#l(this.#i)))),this.#a>0?this.#y():(dt(this.#t,()=>{this.#t=null}),this.#n=!1)}))}is_pending(){return this.#n||!!this.parent&&this.parent.is_pending()}has_pending_snippet(){return!!this.#s.pending}#p(e){var i=v,n=y,r=F;W(this.#r),T(this.#r),yt(this.#r.ctx);try{return e()}catch(s){return Gt(s),null}finally{W(i),T(n),yt(r)}}#y(){const e=this.#s.pending;this.#e!==null&&(this.#c=document.createDocumentFragment(),Ve(this.#e,this.#c)),this.#t===null&&(this.#t=q(()=>e(this.#i)))}#v(e){if(!this.has_pending_snippet()){this.parent&&this.parent.#v(e);return}this.#a+=e,this.#a===0&&(this.#n=!1,this.#t&&dt(this.#t,()=>{this.#t=null}),this.#c&&(this.#i.before(this.#c),this.#c=null),vt(()=>{k.ensure().flush()}))}update_pending_count(e){this.#v(e),this.#f+=e,Tt.add(this.#g)}get_effect_pending(){return this.#_(),$(this.#h)}error(e){var i=this.#s.onerror;let n=this.#s.failed;if(this.#u||!i&&!n)throw e;this.#e&&(R(this.#e),this.#e=null),this.#t&&(R(this.#t),this.#t=null),this.#o&&(R(this.#o),this.#o=null);var r=!1,s=!1;const o=()=>{if(r){Ie();return}r=!0,s&&Re(),k.ensure(),this.#f=0,this.#o!==null&&dt(this.#o,()=>{this.#o=null}),this.#n=this.has_pending_snippet(),this.#e=this.#p(()=>(this.#u=!1,q(()=>this.#l(this.#i)))),this.#a>0?this.#y():this.#n=!1};var l=y;try{T(null),s=!0,i?.(e,o),s=!1}catch(a){gt(a,this.#r&&this.#r.parent)}finally{T(l)}n&&vt(()=>{this.#o=this.#p(()=>{this.#u=!0;try{return q(()=>{n(this.#i,()=>e,()=>o)})}catch(a){return gt(a,this.#r.parent),null}finally{this.#u=!1}})})}}function Ve(t,e){for(var i=t.nodes_start,n=t.nodes_end;i!==null;){var r=i===n?null:re(i);e.append(i),i=r}}function Zt(t){var e=t.effects;if(e!==null){t.effects=null;for(var i=0;i<e.length;i+=1)R(e[i])}}function Ge(t){for(var e=t.parent;e!==null;){if((e.f&M)===0)return e;e=e.parent}return null}function Rt(t){var e,i=v;W(Ge(t));try{Zt(t),e=he(t)}finally{W(i)}return e}function Jt(t){var e=Rt(t);if(t.equals(e)||(t.v=e,t.wv=ue()),!at){var i=(O||(t.f&P)!==0)&&t.deps!==null?Y:m;x(t,i)}}const L=new Map;function Pt(t,e){var i={f:0,v:t,reactions:null,equals:Be,rv:0,wv:0};return i}function D(t,e){const i=Pt(t);return ai(i),i}function U(t,e,i=!1){y!==null&&(!C||(y.f&Bt)!==0)&&wt()&&(y.f&(M|j|Ct|Bt))!==0&&!I?.includes(t)&&Fe();let n=i?tt(e):e;return Qt(t,n)}function Qt(t,e){if(!t.equals(e)){var i=t.v;at?L.set(t,e):L.set(t,i),t.v=e;var n=k.ensure();n.capture(t,i),(t.f&M)!==0&&((t.f&S)!==0&&Rt(t),x(t,(t.f&P)===0?m:Y)),t.wv=ue(),te(t,S),wt()&&v!==null&&(v.f&m)!==0&&(v.f&(z|V))===0&&(E===null?li([t]):E.push(t))}return e}function it(t){U(t,t.v+1)}function te(t,e){var i=t.reactions;if(i!==null)for(var n=wt(),r=i.length,s=0;s<r;s++){var o=i[s],l=o.f;if(!(!n&&o===v)){var a=(l&S)===0;a&&x(o,e),(l&M)!==0?te(o,Y):a&&((l&j)!==0&&X!==null&&X.push(o),Q(o))}}}function tt(t){if(typeof t!="object"||t===null||xt in t)return t;const e=me(t);if(e!==ge&&e!==_e)return t;var i=new Map,n=Xt(t),r=D(0),s=H,o=l=>{if(H===s)return l();var a=y,c=H;T(null),Wt(s);var u=l();return T(a),Wt(c),u};return n&&i.set("length",D(t.length)),new Proxy(t,{defineProperty(l,a,c){(!("value"in c)||c.configurable===!1||c.enumerable===!1||c.writable===!1)&&Ce();var u=i.get(a);return u===void 0?u=o(()=>{var h=D(c.value);return i.set(a,h),h}):U(u,c.value,!0),!0},deleteProperty(l,a){var c=i.get(a);if(c===void 0){if(a in l){const u=o(()=>D(_));i.set(a,u),it(r)}}else U(c,_),it(r);return!0},get(l,a,c){if(a===xt)return t;var u=i.get(a),h=a in l;if(u===void 0&&(!h||et(l,a)?.writable)&&(u=o(()=>{var f=tt(h?l[a]:_),p=D(f);return p}),i.set(a,u)),u!==void 0){var d=$(u);return d===_?void 0:d}return Reflect.get(l,a,c)},getOwnPropertyDescriptor(l,a){var c=Reflect.getOwnPropertyDescriptor(l,a);if(c&&"value"in c){var u=i.get(a);u&&(c.value=$(u))}else if(c===void 0){var h=i.get(a),d=h?.v;if(h!==void 0&&d!==_)return{enumerable:!0,configurable:!0,value:d,writable:!0}}return c},has(l,a){if(a===xt)return!0;var c=i.get(a),u=c!==void 0&&c.v!==_||Reflect.has(l,a);if(c!==void 0||v!==null&&(!u||et(l,a)?.writable)){c===void 0&&(c=o(()=>{var d=u?tt(l[a]):_,f=D(d);return f}),i.set(a,c));var h=$(c);if(h===_)return!1}return u},set(l,a,c,u){var h=i.get(a),d=a in l;if(n&&a==="length")for(var f=c;f<h.v;f+=1){var p=i.get(f+"");p!==void 0?U(p,_):f in l&&(p=o(()=>D(_)),i.set(f+"",p))}if(h===void 0)(!d||et(l,a)?.writable)&&(h=o(()=>D(void 0)),U(h,tt(c)),i.set(a,h));else{d=h.v!==_;var A=o(()=>tt(c));U(h,A)}var lt=Reflect.getOwnPropertyDescriptor(l,a);if(lt?.set&&lt.set.call(u,c),!d){if(n&&typeof a=="string"){var ct=i.get("length"),B=Number(a);Number.isInteger(B)&&B>=ct.v&&U(ct,B+1)}it(r)}return!0},ownKeys(l){$(r);var a=Reflect.ownKeys(l).filter(h=>{var d=i.get(h);return d===void 0||d.v!==_});for(var[c,u]of i)u.v!==_&&!(c in l)&&a.push(c);return a},setPrototypeOf(){Se()}})}var Nt,ee,ie,ne;function Ke(){if(Nt===void 0){Nt=window,ee=/Firefox/.test(navigator.userAgent);var t=Element.prototype,e=Node.prototype,i=Text.prototype;ie=et(e,"firstChild").get,ne=et(e,"nextSibling").get,It(t)&&(t.__click=void 0,t.__className=void 0,t.__attributes=null,t.__style=void 0,t.__e=void 0),It(i)&&(i.__t=void 0)}}function $e(t=""){return document.createTextNode(t)}function Ze(t){return ie.call(t)}function re(t){return ne.call(t)}function se(t){var e=y,i=v;T(null),W(null);try{return t()}finally{T(e),W(i)}}function Je(t,e){var i=e.last;i===null?e.last=e.first=t:(i.next=t,t.prev=i,e.last=t)}function ot(t,e,i,n=!0){var r=v;r!==null&&(r.f&J)!==0&&(t|=J);var s={ctx:F,deps:null,nodes_start:null,nodes_end:null,f:t|S,first:null,fn:e,last:null,next:null,parent:r,b:r&&r.b,prev:null,teardown:null,transitions:null,wv:0,ac:null};if(i)try{rt(s),s.f|=jt}catch(a){throw R(s),a}else e!==null&&Q(s);if(n){var o=s;if(i&&o.deps===null&&o.teardown===null&&o.nodes_start===null&&o.first===o.last&&(o.f&mt)===0&&(o=o.first),o!==null&&(o.parent=r,r!==null&&Je(o,r),y!==null&&(y.f&M)!==0&&(t&V)===0)){var l=y;(l.effects??=[]).push(o)}}return s}function Qe(){return y!==null&&!C}function ti(t){return ot(Ht|Te,t,!1)}function ei(t){k.ensure();const e=ot(V|mt,t,!0);return(i={})=>new Promise(n=>{i.outro?dt(e,()=>{R(e),n(void 0)}):(R(e),n(void 0))})}function ii(t,e=0){return ot(Ee|e,t,!0)}function ni(t,e=0){var i=ot(j|e,t,!0);return i}function q(t,e=!0){return ot(z|mt,t,!0,e)}function oe(t){var e=t.teardown;if(e!==null){const i=at,n=y;Lt(!0),T(null);try{e.call(null)}finally{Lt(i),T(n)}}}function ae(t,e=!1){var i=t.first;for(t.first=t.last=null;i!==null;){const r=i.ac;r!==null&&se(()=>{r.abort(Vt)});var n=i.next;(i.f&V)!==0?i.parent=null:R(i,e),i=n}}function ri(t){for(var e=t.first;e!==null;){var i=e.next;(e.f&z)===0&&R(e),e=i}}function R(t,e=!0){var i=!1;(e||(t.f&ke)!==0)&&t.nodes_start!==null&&t.nodes_end!==null&&(si(t.nodes_start,t.nodes_end),i=!0),ae(t,e&&!i),_t(t,0),x(t,st);var n=t.transitions;if(n!==null)for(const s of n)s.stop();oe(t);var r=t.parent;r!==null&&r.first!==null&&le(t),t.next=t.prev=t.teardown=t.ctx=t.deps=t.fn=t.nodes_start=t.nodes_end=t.ac=null}function si(t,e){for(;t!==null;){var i=t===e?null:re(t);t.remove(),t=i}}function le(t){var e=t.parent,i=t.prev,n=t.next;i!==null&&(i.next=n),n!==null&&(n.prev=i),e!==null&&(e.first===t&&(e.first=n),e.last===t&&(e.last=i))}function dt(t,e){var i=[];ce(t,i,!0),oi(i,()=>{R(t),e&&e()})}function oi(t,e){var i=t.length;if(i>0){var n=()=>--i||e();for(var r of t)r.out(n)}else e()}function ce(t,e,i){if((t.f&J)===0){if(t.f^=J,t.transitions!==null)for(const o of t.transitions)(o.is_global||i)&&e.push(o);for(var n=t.first;n!==null;){var r=n.next,s=(n.f&zt)!==0||(n.f&z)!==0;ce(n,e,s?i:!1),n=r}}}let Z=!1;function Ot(t){Z=t}let at=!1;function Lt(t){at=t}let y=null,C=!1;function T(t){y=t}let v=null;function W(t){v=t}let I=null;function ai(t){y!==null&&(I===null?I=[t]:I.push(t))}let g=null,b=0,E=null;function li(t){E=t}let fe=1,nt=0,H=nt;function Wt(t){H=t}let O=!1;function ue(){return++fe}function bt(t){var e=t.f;if((e&S)!==0)return!0;if((e&Y)!==0){var i=t.deps,n=(e&P)!==0;if(i!==null){var r,s,o=(e&ht)!==0,l=n&&v!==null&&!O,a=i.length;if((o||l)&&(v===null||(v.f&st)===0)){var c=t,u=c.parent;for(r=0;r<a;r++)s=i[r],(o||!s?.reactions?.includes(c))&&(s.reactions??=[]).push(c);o&&(c.f^=ht),l&&u!==null&&(u.f&P)===0&&(c.f^=P)}for(r=0;r<a;r++)if(s=i[r],bt(s)&&Jt(s),s.wv>t.wv)return!0}(!n||v!==null&&!O)&&x(t,m)}return!1}function de(t,e,i=!0){var n=t.reactions;if(n!==null&&!I?.includes(t))for(var r=0;r<n.length;r++){var s=n[r];(s.f&M)!==0?de(s,e,!1):e===s&&(i?x(s,S):(s.f&m)!==0&&x(s,Y),Q(s))}}function he(t){var e=g,i=b,n=E,r=y,s=O,o=I,l=F,a=C,c=H,u=t.f;g=null,b=0,E=null,O=(u&P)!==0&&(C||!Z||y===null),y=(u&(z|V))===0?t:null,I=null,yt(t.ctx),C=!1,H=++nt,t.ac!==null&&(se(()=>{t.ac.abort(Vt)}),t.ac=null);try{t.f|=kt;var h=t.fn,d=h(),f=t.deps;if(g!==null){var p;if(_t(t,b),f!==null&&b>0)for(f.length=b+g.length,p=0;p<g.length;p++)f[b+p]=g[p];else t.deps=f=g;if(!O||(u&M)!==0&&t.reactions!==null)for(p=b;p<f.length;p++)(f[p].reactions??=[]).push(t)}else f!==null&&b<f.length&&(_t(t,b),f.length=b);if(wt()&&E!==null&&!C&&f!==null&&(t.f&(M|Y|S))===0)for(p=0;p<E.length;p++)de(E[p],t);return r!==null&&r!==t&&(nt++,E!==null&&(n===null?n=E:n.push(...E))),(t.f&pt)!==0&&(t.f^=pt),d}catch(A){return Gt(A)}finally{t.f^=kt,g=e,b=i,E=n,y=r,O=s,I=o,yt(l),C=a,H=c}}function ci(t,e){let i=e.reactions;if(i!==null){var n=ye.call(i,t);if(n!==-1){var r=i.length-1;r===0?i=e.reactions=null:(i[n]=i[r],i.pop())}}i===null&&(e.f&M)!==0&&(g===null||!g.includes(e))&&(x(e,Y),(e.f&(P|ht))===0&&(e.f^=ht),Zt(e),_t(e,0))}function _t(t,e){var i=t.deps;if(i!==null)for(var n=e;n<i.length;n++)ci(t,i[n])}function rt(t){var e=t.f;if((e&st)===0){x(t,m);var i=v,n=Z;v=t,Z=!0;try{(e&j)!==0?ri(t):ae(t),oe(t);var r=he(t);t.teardown=typeof r=="function"?r:null,t.wv=fe;var s;Ut&&De&&(t.f&S)!==0&&t.deps}finally{Z=n,v=i}}}function $(t){var e=t.f,i=(e&M)!==0;if(y!==null&&!C){var n=v!==null&&(v.f&st)!==0;if(!n&&!I?.includes(t)){var r=y.deps;if((y.f&kt)!==0)t.rv<nt&&(t.rv=nt,g===null&&r!==null&&r[b]===t?b++:g===null?g=[t]:(!O||!g.includes(t))&&g.push(t));else{(y.deps??=[]).push(t);var s=t.reactions;s===null?t.reactions=[y]:s.includes(y)||s.push(y)}}}else if(i&&t.deps===null&&t.effects===null){var o=t,l=o.parent;l!==null&&(l.f&P)===0&&(o.f^=P)}if(at){if(L.has(t))return L.get(t);if(i){o=t;var a=o.v;return((o.f&m)===0&&o.reactions!==null||pe(o))&&(a=Rt(o)),L.set(o,a),a}}else i&&(o=t,bt(o)&&Jt(o));if((t.f&pt)!==0)throw t.v;return t.v}function pe(t){if(t.v===_)return!0;if(t.deps===null)return!1;for(const e of t.deps)if(L.has(e)||(e.f&M)!==0&&pe(e))return!0;return!1}function fi(t){var e=C;try{return C=!0,t()}finally{C=e}}const ui=-7169;function x(t,e){t.f=t.f&ui|e}const di=["touchstart","touchmove"];function hi(t){return di.includes(t)}const pi=new Set,Yt=new Set;let qt=null;function ut(t){var e=this,i=e.ownerDocument,n=t.type,r=t.composedPath?.()||[],s=r[0]||t.target;qt=t;var o=0,l=qt===t&&t.__root;if(l){var a=r.indexOf(l);if(a!==-1&&(e===document||e===window)){t.__root=e;return}var c=r.indexOf(e);if(c===-1)return;a<=c&&(o=a)}if(s=r[o]||t.target,s!==e){Et(t,"currentTarget",{configurable:!0,get(){return s||i}});var u=y,h=v;T(null),W(null);try{for(var d,f=[];s!==null;){var p=s.assignedSlot||s.parentNode||s.host||null;try{var A=s["__"+n];if(A!=null&&(!s.disabled||t.target===s))if(Xt(A)){var[lt,...ct]=A;lt.apply(s,[t,...ct])}else A.call(s,t)}catch(B){d?f.push(B):d=B}if(t.cancelBubble||p===e||p===null)break;s=p}if(d){for(let B of f)queueMicrotask(()=>{throw B});throw d}}finally{t.__root=e,delete t.currentTarget,T(u),W(h)}}}function yi(t){var e=document.createElement("template");return e.innerHTML=t.replaceAll("<!>","<!---->"),e.content}function vi(t,e){var i=v;i.nodes_start===null&&(i.nodes_start=t,i.nodes_end=e)}function gi(t,e){var i=(e&Pe)!==0,n,r=!t.startsWith("<!>");return()=>{n===void 0&&(n=yi(r?t:"<!>"+t));var s=i||ee?document.importNode(n,!0):n.cloneNode(!0);{var o=Ze(s),l=s.lastChild;vi(o,l)}return s}}function _i(t){return()=>mi(t())}function mi(t){const e=t.nodeType===Me,i=t.tagName==="SCRIPT"?[t]:t.querySelectorAll("script"),n=v;for(const s of i){const o=document.createElement("script");for(var r of s.attributes)o.setAttribute(r.name,r.value);o.textContent=s.textContent,(e?t.firstChild===s:t===s)&&(n.nodes_start=o),(e?t.lastChild===s:t===s)&&(n.nodes_end=o),s.replaceWith(o)}return t}function wi(t,e){t!==null&&t.before(e)}function bi(t,e){return xi(t,e)}const G=new Map;function xi(t,{target:e,anchor:i,props:n={},events:r,context:s,intro:o=!0}){Ke();var l=new Set,a=h=>{for(var d=0;d<h.length;d++){var f=h[d];if(!l.has(f)){l.add(f);var p=hi(f);e.addEventListener(f,ut,{passive:p});var A=G.get(f);A===void 0?(document.addEventListener(f,ut,{passive:p}),G.set(f,1)):G.set(f,A+1)}}};a(ve(pi)),Yt.add(a);var c=void 0,u=ei(()=>{var h=i??e.appendChild($e());return je(h,{pending:()=>{}},d=>{if(s){Oe({});var f=F;f.c=s}r&&(n.$$events=r),c=t(d,n)||{},s&&Le()}),()=>{for(var d of l){e.removeEventListener(d,ut);var f=G.get(d);--f===0?(document.removeEventListener(d,ut),G.delete(d)):G.set(d,f)}Yt.delete(a),h!==i&&h.parentNode?.removeChild(h)}});return Ei.set(c,u),c}let Ei=new WeakMap;const ki="5";typeof window<"u"&&((window.__svelte??={}).v??=new Set).add(ki);Ne();var Ti=_i(gi(`<!DOCTYPE html=""/> <html lang="en"><head><meta charset="UTF-8"/> <meta name="viewport" content="width=device-width, initial-scale=1.0"/> <title>Littledrop</title> <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"><\/script> <style>* {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      overflow: hidden;
      background: #fdfcfa;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      touch-action: none;
    }
    
    #gameCanvas {
      display: block;
      cursor: pointer;
    }
    
    .ui-button {
      position: fixed;
      top: 20px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.9);
      border: 2px solid #ddd;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      user-select: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      transition: transform 0.1s;
      z-index: 1000;
    }
    
    .ui-button:hover {
      transform: scale(1.05);
    }
    
    .ui-button:active {
      transform: scale(0.95);
    }
    
    #pauseBtn {
      left: 20px;
    }
    
    #muteBtn {
      right: 20px;
    }</style></head> <body><canvas id="gameCanvas"></canvas> <button id="pauseBtn" class="ui-button">⏸</button> <button id="muteBtn" class="ui-button">🔊</button> <script>
    // Audio Manager
    class AudioManager {
      constructor() {
        this.ctx = null;
        this.muted = false;
        this.master = null;
        this.scale = [
          220.00, 246.94, 261.63, 293.66, 329.63, 392.00,
          440.00, 493.88, 523.25, 587.33, 659.25, 784.00, 880.00, 1046.50
        ]; // A minor pentatonic (A3–A5)
        this.initialized = false;
      }

      init() {
        if (this.initialized) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
        this.master.gain.value = 0.6;
        this.initialized = true;
      }

      resume() {
        if (!this.initialized) this.init();
        if (this.ctx.state === 'suspended') return this.ctx.resume();
      }

      playXylophoneNote(index = 0, duration = 0.35) {
        if (this.muted || !this.initialized) return;
        const freq = this.scale[Math.abs(index) % this.scale.length];
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.master);
        const now = this.ctx.currentTime;
        osc.start(now);
        gain.gain.value = 0.0001;
        gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        osc.stop(now + duration + 0.02);
      }

      playCollisionSound() {
        if (this.muted || !this.initialized) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = 164.81;  // Higher frequency for better audibility
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(this.master);
        const now = this.ctx.currentTime;
        osc.start(now);
        gain.gain.value = 0.0001;
        gain.gain.linearRampToValueAtTime(0.08, now + 0.005);  // Increased peak volume
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);  // Shorter duration
        osc.stop(now + 0.1);
      }

      setMuted(v) {
        this.muted = v;
        if (this.master) this.master.gain.value = v ? 0 : 0.6;
      }
    }

    // Game
    class LittledropGame {
      constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dpr = window.devicePixelRatio || 1;
        
        this.worldWidth = 2000;
        this.worldHeight = 2000;
        
        this.camera = { x: 1000, y: 1000 };
        this.player = {
          x: 1000,
          y: 1000,
          vx: 0,
          vy: 0,
          radius: 18,
          speed: 20,
          isDragging: false,
          inputTarget: null,
          body: null
        };
        
        this.ripples = [];
        this.entities = [];
        this.paused = false;
        this.audioManager = new AudioManager();
        this.keys = { left: false, right: false, up: false, down: false };
        
        this.lastTime = performance.now();
        this.rippleTimer = 0;
        
        this.setupPhysics();
        this.setupCanvas();
        this.setupEntities();
        this.setupInput();
        this.setupUI();
        
        this.loop();
      }

      setupPhysics() {
        const { Engine, Bodies, World } = Matter;
        this.engine = Engine.create();
        this.engine.gravity.y = 0;
        
        // Player body
        this.player.body = Bodies.circle(this.player.x, this.player.y, this.player.radius, {
          frictionAir: 0.08,
          restitution: 0.3,
          density: 0.002,
          label: 'player'
        });
        World.add(this.engine.world, this.player.body);

  // Add hard world boundaries so objects can't leave the world
  // We make walls slightly thicker and positioned on the edges of the world
  this.boundaries = [];
  const wallThickness = 80;
  const halfW = this.worldWidth / 2;
  const halfH = this.worldHeight / 2;

  const top = Bodies.rectangle(halfW, -wallThickness / 2, this.worldWidth + wallThickness * 2, wallThickness, { isStatic: true, label: 'boundary' });
  const bottom = Bodies.rectangle(halfW, this.worldHeight + wallThickness / 2, this.worldWidth + wallThickness * 2, wallThickness, { isStatic: true, label: 'boundary' });
  const left = Bodies.rectangle(-wallThickness / 2, halfH, wallThickness, this.worldHeight + wallThickness * 2, { isStatic: true, label: 'boundary' });
  const right = Bodies.rectangle(this.worldWidth + wallThickness / 2, halfH, wallThickness, this.worldHeight + wallThickness * 2, { isStatic: true, label: 'boundary' });

  World.add(this.engine.world, [top, bottom, left, right]);
  this.boundaries.push(top, bottom, left, right);
        
        // Collision detection
        Matter.Events.on(this.engine, 'collisionStart', (event) => {
          event.pairs.forEach(pair => {
            if (pair.bodyA.label === 'player' || pair.bodyB.label === 'player') {
              this.audioManager.playCollisionSound();
            }
          });
        });
      }

      setupCanvas() {
        const resize = () => {
          this.canvas.width = window.innerWidth * this.dpr;
          this.canvas.height = window.innerHeight * this.dpr;
          this.canvas.style.width = window.innerWidth + 'px';
          this.canvas.style.height = window.innerHeight + 'px';
        };
        resize();
        window.addEventListener('resize', resize);
      }

      setupEntities() {
        const { Bodies, World } = Matter;
        
        // Add rocks (static)
        for (let i = 0; i < 11; i++) {
          const x = 300 + Math.random() * 1400;
          const y = 300 + Math.random() * 1400;
          const radius = 10 + Math.random() * 15;
          const body = Bodies.circle(x, y, radius, { isStatic: true, label: 'rock' });
          World.add(this.engine.world, body);
          this.entities.push({ type: 'rock', body, radius });
        }
        
        // Add lily pads (heavy but pushable)
        for (let i = 0; i < 9; i++) {
          const x = 100 + Math.random() * 1800;
          const y = 100 + Math.random() * 1800;
          const radius = 45;
          const angle = Math.random() * Math.PI * 2; // Random angle between 0 and 2π
          const body = Bodies.circle(x, y, radius, {
            frictionAir: 0.15,  // High air friction to prevent sliding too much
            restitution: 0.2,   // Low bounciness
            density: 0.001,     // Higher density than leaves (0.0005) but still pushable
            label: 'lilypad',
            angle: angle // Set initial angle
          });
          World.add(this.engine.world, body);
          this.entities.push({ type: 'lilypad', body, radius, angle }); // Store the angle in the entity
        }
        
        // Add leaves (dynamic, light)
        for (let i = 0; i < 13; i++) {
          const x = 300 + Math.random() * 1400;
          const y = 300 + Math.random() * 1400;
          const radius = 20;
          const body = Bodies.circle(x, y, radius, {
            frictionAir: 0.1,
            restitution: 0.4,
            density: 0.0005,
            label: 'leaf'
          });
          World.add(this.engine.world, body);
          this.entities.push({
            type: 'leaf',
            body,
            radius,
            drift: { vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20 }
          });
        }
        
        // Add fish (dynamic with AI)
        const fishColors = [
          { fill: '#ff9966', stroke: '#ff7744' },
          { fill: '#ffcc66', stroke: '#ffaa44' },
          { fill: '#66ccff', stroke: '#44aaff' },
          { fill: '#cc99ff', stroke: '#aa77ff' },
          { fill: '#ff6699', stroke: '#ff4477' },
          { fill: '#1cd9ad', stroke: '#1cbba3' },
          { fill: '#000000', stroke: '#000000' }
        ];
        
        for (let i = 0; i < 44; i++) {
          const x = 200 + Math.random() * 1600;
          const y = 200 + Math.random() * 1600;
          const radius = 16;
          const body = Bodies.circle(x, y, radius, {
            frictionAir: 0.15,
            density: 0.001,
            label: 'fish'
          });
          World.add(this.engine.world, body);
          this.entities.push({
            type: 'fish',
            body,
            radius,
            fearRadius: 300,
            fleeTimer: 0,
            targetX: x,
            targetY: y,
            wanderAngle: Math.random() * Math.PI * 2,
            color: fishColors[i % fishColors.length]
          });
        }
      }

      setupInput() {
        const getPointer = (e) => {
          const rect = this.canvas.getBoundingClientRect();
          const clientX = e.touches ? e.touches[0].clientX : e.clientX;
          const clientY = e.touches ? e.touches[0].clientY : e.clientY;
          
          const x = (clientX - rect.left) * (this.canvas.width / rect.width) / this.dpr;
          const y = (clientY - rect.top) * (this.canvas.height / rect.height) / this.dpr;
          
          return {
            x: x + this.camera.x - this.canvas.width / 2 / this.dpr,
            y: y + this.camera.y - this.canvas.height / 2 / this.dpr
          };
        };

        const onDown = (e) => {
          e.preventDefault();
          this.audioManager.resume();
          const pointer = getPointer(e);
          this.player.isDragging = true;
          this.player.inputTarget = pointer;
          this.createRipple(pointer.x, pointer.y);
        };

        const onMove = (e) => {
          if (!this.player.isDragging) return;
          e.preventDefault();
          this.player.inputTarget = getPointer(e);
        };

        const onUp = (e) => {
          e.preventDefault();
          this.player.isDragging = false;
        };

        this.canvas.addEventListener('mousedown', onDown);
        this.canvas.addEventListener('mousemove', onMove);
        this.canvas.addEventListener('mouseup', onUp);
        this.canvas.addEventListener('touchstart', onDown);
        this.canvas.addEventListener('touchmove', onMove);
        this.canvas.addEventListener('touchend', onUp);
        
        // Keyboard controls
        window.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') this.keys.left = true;
          if (e.key === 'ArrowRight') this.keys.right = true;
          if (e.key === 'ArrowUp') this.keys.up = true;
          if (e.key === 'ArrowDown') this.keys.down = true;
        });
        
        window.addEventListener('keyup', (e) => {
          if (e.key === 'ArrowLeft') this.keys.left = false;
          if (e.key === 'ArrowRight') this.keys.right = false;
          if (e.key === 'ArrowUp') this.keys.up = false;
          if (e.key === 'ArrowDown') this.keys.down = false;
        });
      }

      setupUI() {
        document.getElementById('pauseBtn').addEventListener('click', () => {
          this.paused = !this.paused;
          document.getElementById('pauseBtn').textContent = this.paused ? '▶' : '⏸';
        });

        document.getElementById('muteBtn').addEventListener('click', () => {
          this.audioManager.setMuted(!this.audioManager.muted);
          document.getElementById('muteBtn').textContent = this.audioManager.muted ? '🔇' : '🔊';
        });
      }

      createRipple(x, y) {
        const maxRadius = 220 + Math.random() * 60;
        this.ripples.push({ x, y, age: 0, life: 900, maxRadius });
        const noteIndex = Math.floor(Math.random() * 14);
        this.audioManager.playXylophoneNote(noteIndex);
      }

      update(dt) {
        if (this.paused) return;
        
        const dtSec = dt / 1000;
        Matter.Engine.update(this.engine, dt);
        
        // Update player movement from mouse/touch
        if (this.player.inputTarget) {
          const dx = this.player.inputTarget.x - this.player.body.position.x;
          const dy = this.player.inputTarget.y - this.player.body.position.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 5) {
            const force = 0.0015; // was 0.0008
            Matter.Body.applyForce(this.player.body, this.player.body.position, {
              x: (dx / dist) * force,
              y: (dy / dist) * force
            });
          }
        }
        
        // Update player movement from keyboard
        let kbForceX = 0;
        let kbForceY = 0;
        const kbForce = 0.0008;
        
        if (this.keys.left) kbForceX -= kbForce;
        if (this.keys.right) kbForceX += kbForce;
        if (this.keys.up) kbForceY -= kbForce;
        if (this.keys.down) kbForceY += kbForce;
        
        if (kbForceX !== 0 || kbForceY !== 0) {
          Matter.Body.applyForce(this.player.body, this.player.body.position, {
            x: kbForceX,
            y: kbForceY
          });
        }
        
        this.player.x = this.player.body.position.x;
        this.player.y = this.player.body.position.y;
        
        // Ripple creation based on movement
        this.rippleTimer += dt;
        const speed = Math.sqrt(this.player.body.velocity.x ** 2 + this.player.body.velocity.y ** 2);
        if (speed > 0.5 && this.rippleTimer > 250) {
          this.createRipple(this.player.x, this.player.y);
          this.rippleTimer = 0;
        }
        
        // Update ripples
        this.ripples = this.ripples.filter(r => {
          r.age += dt;
          return r.age < r.life;
        });
        
        // Update fish AI with schooling behavior
        const fishEntities = this.entities.filter(e => e.type === 'fish');
        
        this.entities.forEach(entity => {
          if (entity.type === 'fish') {
            const dx = this.player.x - entity.body.position.x;
            const dy = this.player.y - entity.body.position.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Check distance to world edges
            const edgeBuffer = 100;
            const distToLeftEdge = entity.body.position.x;
            const distToRightEdge = this.worldWidth - entity.body.position.x;
            const distToTopEdge = entity.body.position.y;
            const distToBottomEdge = this.worldHeight - entity.body.position.y;
            
            let edgeAvoidX = 0;
            let edgeAvoidY = 0;
            
            // Add force to avoid edges
            if (distToLeftEdge < edgeBuffer) edgeAvoidX += 1;
            if (distToRightEdge < edgeBuffer) edgeAvoidX -= 1;
            if (distToTopEdge < edgeBuffer) edgeAvoidY += 1;
            if (distToBottomEdge < edgeBuffer) edgeAvoidY -= 1;
            
            if (dist < entity.fearRadius) {
              // Flee from player
              const fleeForce = 0.0006;
              const nx = -dx / dist;
              const ny = -dy / dist;
              Matter.Body.applyForce(entity.body, entity.body.position, {
          x: nx * fleeForce,
          y: ny * fleeForce
              });
              entity.fleeTimer = 2000;
            } else if (entity.fleeTimer <= 0) {
              // Initialize wanderAngle and wanderChangeTimer if not exists
              if (entity.wanderAngle === undefined) {
          entity.wanderAngle = Math.random() * Math.PI * 2;
          entity.wanderChangeTimer = 0;
              }
              
              // Update wander angle periodically
              entity.wanderChangeTimer -= dt;
              if (entity.wanderChangeTimer <= 0) {
          entity.wanderAngle += (Math.random() - 0.5) * Math.PI * 0.5;
          entity.wanderChangeTimer = 500 + Math.random() * 1000; // Change direction every 0.5-1.5 seconds
              }
              
              // Calculate wander force
              const wanderStrength = 0.0003;
              const wanderX = Math.cos(entity.wanderAngle) * wanderStrength;
              const wanderY = Math.sin(entity.wanderAngle) * wanderStrength;
              
              // Combine with edge avoidance
              const edgeForce = 0.0004;
              Matter.Body.applyForce(entity.body, entity.body.position, {
          x: wanderX + edgeAvoidX * edgeForce,
          y: wanderY + edgeAvoidY * edgeForce
              });
              
              // Add some schooling behavior (reduced strength)
              let separationX = 0, separationY = 0;
              let neighborCount = 0;
              
              fishEntities.forEach(other => {
          if (other === entity) return;
          const odx = other.body.position.x - entity.body.position.x;
          const ody = other.body.position.y - entity.body.position.y;
          const odist = Math.sqrt(odx * odx + ody * ody);
          
          if (odist < 50 && odist > 0) {
            separationX -= odx / odist;
            separationY -= ody / odist;
            neighborCount++;
          }
              });
              
              if (neighborCount > 0) {
          const separationForce = 0.00004;
          Matter.Body.applyForce(entity.body, entity.body.position, {
            x: separationX * separationForce,
            y: separationY * separationForce
          });
              }
            } else {
              entity.fleeTimer -= dt;
            }
          } else if (entity.type === 'leaf' && entity.drift) {
            // Apply gentle drift to leaves
            const driftForce = 0.00005;
            Matter.Body.applyForce(entity.body, entity.body.position, {
              x: entity.drift.vx * driftForce,
              y: entity.drift.vy * driftForce
            });
          }
        });
        
        // Update camera (smooth follow)
        const targetCameraX = this.player.x;
        const targetCameraY = this.player.y;
        this.camera.x += (targetCameraX - this.camera.x) * 0.12;
        this.camera.y += (targetCameraY - this.camera.y) * 0.12;
        
        // Clamp camera to world bounds
        const halfW = this.canvas.width / 2 / this.dpr;
        const halfH = this.canvas.height / 2 / this.dpr;
        this.camera.x = Math.max(halfW, Math.min(this.worldWidth - halfW, this.camera.x));
        this.camera.y = Math.max(halfH, Math.min(this.worldHeight - halfH, this.camera.y));
      }

      drawWaterBlob(ctx, x, y, radius, velocity) {
        const time = performance.now() / 1000;
        const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2);
        
        // Calculate deformation based on velocity
        const stretchFactor = Math.min(speed / 100, 0.4);
        const angle = Math.atan2(velocity.y, velocity.x);
        
        // Create blob shape with 17 control points
        const points = 17;
        const coords = [];
        
        for (let i = 0; i < points; i++) {
          const baseAngle = (i / points) * Math.PI * 2;
          
          // Random wobble that changes over time
          const wobbleFreq = 2 + i * 0.5;
          const wobbleAmt = 0.04 + Math.sin(time * 3 + i) * 0.03;
          const wobble = Math.sin(time * wobbleFreq + i * 2) * wobbleAmt;
          
          // Stretch in direction of movement
          let r = radius * (1 + wobble);
          const angleDiff = baseAngle - angle;
          const stretchInfluence = Math.cos(angleDiff);
          
          if (stretchInfluence > 0) {
            r *= (1 + stretchFactor * stretchInfluence);
          } else {
            r *= (1 - stretchFactor * 0.3 * Math.abs(stretchInfluence));
          }
          
          coords.push({
            x: x + Math.cos(baseAngle) * r,
            y: y + Math.sin(baseAngle) * r
          });
        }
        
        // Draw smooth blob using cardinal spline
        ctx.beginPath();
        ctx.moveTo(coords[0].x, coords[0].y);
        
        for (let i = 0; i < points; i++) {
          const curr = coords[i];
          const next = coords[(i + 1) % points];
          const prev = coords[(i - 1 + points) % points];
          const next2 = coords[(i + 2) % points];
          
          const tension = 0.5;
          const cp1x = curr.x + (next.x - prev.x) / 6 * tension;
          const cp1y = curr.y + (next.y - prev.y) / 6 * tension;
          const cp2x = next.x - (next2.x - curr.x) / 6 * tension;
          const cp2y = next.y - (next2.y - curr.y) / 6 * tension;
          
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, next.x, next.y);
        }
        
        ctx.closePath();
        
        // Gradient fill
        const gradient = ctx.createRadialGradient(x - 3, y - 3, 0, x, y, radius);
        gradient.addColorStop(0, '#e8f7ff');
        gradient.addColorStop(0.6, '#bfe7ff');
        gradient.addColorStop(1, '#8dd5ff');
        ctx.fillStyle = gradient;
        ctx.fill();
        
  // No outline: draw fill-only for the blob
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(x - 5, y - 6, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      render() {
        const ctx = this.ctx;
        const dpr = this.dpr;
        
        ctx.save();
        ctx.scale(dpr, dpr);
        
        // Clear
        ctx.fillStyle = '#fdfcfa';
        ctx.fillRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
        
        // Transform to world space
        ctx.translate(-this.camera.x + this.canvas.width / 2 / dpr, -this.camera.y + this.canvas.height / 2 / dpr);
        
        // Draw world boundary
        ctx.strokeStyle = '#e5e5e5';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, this.worldWidth, this.worldHeight);
        
        // Draw entities
        this.entities.forEach(entity => {
          const pos = entity.body.position;
          const time = performance.now() / 1000;
          
          ctx.save();
          ctx.translate(pos.x, pos.y);
          
          // Breathing animation
          const breathScale = 1 + 0.02 * Math.sin(time * 1.2 + entity.body.id);
          ctx.scale(breathScale, breathScale);
          
            if (entity.type === 'rock') {
            ctx.fillStyle = '#e9e5df';
            ctx.beginPath();
            ctx.arc(0, 0, entity.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (entity.type === 'lilypad') {
            // Rotate the entire lilypad including notch based on body angle
            ctx.rotate(entity.body.angle);
            
            // Draw main lilypad
            ctx.fillStyle = '#d3e8c6';
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.2, entity.radius * 0.9, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Draw notch
            ctx.fillStyle = '#fdfcfa';
            ctx.beginPath();
            ctx.moveTo(entity.radius * 0.7, 0);
            ctx.lineTo(entity.radius * 1.2, -5);
            ctx.lineTo(entity.radius * 1.2, 5);
            ctx.fill();
          } else if (entity.type === 'leaf') {
            ctx.fillStyle = '#cbecc7';
            ctx.rotate(entity.body.angle);
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.8, 0, 0, Math.PI * 2);
            ctx.fill();
          } else if (entity.type === 'fish') {
            const vx = entity.body.velocity.x;
            const flipX = vx < 0 ? -1 : 1;
            ctx.scale(flipX, 1);
            ctx.fillStyle = entity.color.fill;
            ctx.beginPath();
            ctx.ellipse(0, 0, entity.radius * 1.5, entity.radius * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            ctx.beginPath();
            ctx.moveTo(-entity.radius * 1.5, 0);
            ctx.lineTo(-entity.radius * 2.2, -entity.radius * 0.6);
            ctx.lineTo(-entity.radius * 2.2, entity.radius * 0.6);
            ctx.closePath();
            ctx.fill();
          }
          
          ctx.restore();
        });
        
        // Draw player with animated deformation
        this.drawWaterBlob(
          ctx,
          this.player.x,
          this.player.y,
          this.player.radius,
          this.player.body.velocity
        );
        
        // Draw ripples
        this.ripples.forEach(r => {
          const progress = r.age / r.life;
          const radius = r.maxRadius * progress;
          const alpha = 1 - progress;
          
          ctx.strokeStyle = \`rgba(127, 191, 223, \${alpha * 0.5})\`;
          ctx.lineWidth = 4 * (1 - progress);
          ctx.beginPath();
          ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        });
        
        ctx.restore();
      }

      loop() {
        const now = performance.now();
        const dt = Math.min(now - this.lastTime, 100);
        this.lastTime = now;
        
        this.update(dt);
        this.render();
        
        requestAnimationFrame(() => this.loop());
      }
    }

    // Start game
    window.addEventListener('load', () => {
      new LittledropGame();
    });
  <\/script></body></html>`,1));function Mi(t){var e=Ti();wi(t,e)}bi(Mi,{target:document.getElementById("app")});
