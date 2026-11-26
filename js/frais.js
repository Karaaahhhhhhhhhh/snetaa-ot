/* =========================================================
   Frais de déplacement — module intégré
   Reprend l'application de déclaration de frais du syndicat (référence testée) :
   numérisation des justificatifs (détection de plusieurs tickets, redressement,
   lecture OCR sur l'appareil), affectation automatique, contrôles, PDF, transfert
   des photos par QR code. Les fiches (montants, statuts) voyagent avec les données
   chiffrées de l'application ; les photos restent sur l'appareil du déclarant.
   ========================================================= */
'use strict';
const Frais = (() => {
"use strict";
/* ============ Constantes ============ */
const LIB = 'lib/frais/';
const TYPES={peage:"Péage",parking:"Parking",restaurant:"Restaurant",carburant:"Carburant",transport:"Train / bus",hebergement:"Hébergement",convocation:"Convocation",postal:"Frais postaux",telephonie:"Internet / téléphone",autre:"Autre"};
const DEFAULT_TRAJETS=[["Plaimpied - Blois",121],["Plaimpied - Blois via Romorantin",122],["Plaimpied - Bourges",20],["Plaimpied - Orléans",128],["Plaimpied - Orléans via Salbris",136],["Plaimpied - Romorantin",90],["Plaimpied - Saint Avertin",158],["Plaimpied - Saint Avertin via Romorantin",172],["Plaimpied - Salbris",69],["Plaimpied - Tours",168],["Plaimpied - Vierzon",44],["Romorantin - Blois",45],["Romorantin - Orléans",63],["Romorantin - Orléans via Salbris",84],["Romorantin - Plaimpied",90],["Romorantin - Saint Aignan",34],["Romorantin - Saint Avertin",102],["Romorantin - Salbris",25],["Romorantin - Tours",90]].map(([label,km])=>({label,km}));
const DEFAULT_MOTIFS=["Audience DSDEN","Audience établissement","Audience rectorat","Bureau académique","CAPA","F3SCT-A","F3SCT-D","Congrès académique","Conseil national","Conseil syndical académique","CSA-A","CSA-D","Enquête F3SCT","Groupe de travail F3SCT-A","Groupe de travail F3SCT-D","Groupe de travail rectorat","Groupe de travail SNETAA","Permanence syndicale","Visite établissement","Autre"];
const FONCTIONS=["Adhérent","Commissaire paritaire","Secrétaire académique","Secrétaire départemental","Trésorière"];
const MOIS=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const STATUTS={brouillon:["Brouillon",""],envoyee:["Envoyée","acc"],corriger:["À corriger","warn"],validee:["Validée","ok"],payee:["Payée","ok"]};
const ICON={
 deps:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 17h14M6 17l1.5-6h9L18 17"/><circle cx="8" cy="18.5" r="1.5"/><circle cx="16" cy="18.5" r="1.5"/><path d="M9 11V7h6v4"/></svg>',
 pieces:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
 recap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h4"/></svg>',
 reg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>',
 tous:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/><path d="M17 16l2 2 3-4"/></svg>',
 commun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>',
 cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
 up:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 16v4h16v-4"/></svg>',
 dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
 copy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>',
 rotL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 4v6h6"/><path d="M4.5 10A8 8 0 1 1 6 16.5"/></svg>',
 rotR:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 4v6h-6"/><path d="M19.5 10A8 8 0 1 0 18 16.5"/></svg>'
};

/* ============ Utilitaires ============ */
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const n=v=>{const x=parseFloat(String(v==null?"":v).replace(",","."));return isFinite(x)?x:0};
const r2=x=>Math.round(x*100)/100;
const eur=x=>r2(x).toLocaleString("fr-FR",{minimumFractionDigits:2,maximumFractionDigits:2})+" €";
const eurPdf=x=>r2(x).toFixed(2).replace(".",",").replace(/\B(?=(\d{3})+(?!\d))/g," ")+" €";
const today=()=>todayISO();
const fdate=s=>{if(!s)return "";const [y,m,d]=String(s).split("-");return d&&m&&y?`${d.slice(0,2)}/${m}/${y}`:s};
const clone=o=>JSON.parse(JSON.stringify(o));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const withTimeout=(p,ms,fallback)=>Promise.race([p,new Promise(r=>setTimeout(()=>r(fallback),ms))]);
const toast=(m,ms)=>UI.toast(m);
const kmTxt=x=>(Math.round(n(x)*10)/10).toLocaleString("fr-FR")+" km";

/* ============ Données communes (barème, motifs, lieux, distances) ============ */
function conf(){
  const m=D.meta.frais=D.meta.frais||{};
  if(!Array.isArray(m.baremes)||!m.baremes.length)m.baremes=[{id:"b0",depuis:"2000-01-01",km:0.20,repasMax:10,note:"Péages et parking remboursés au réel (100 %). Repas : dépense réelle, plafonnée à 10 € par repas, sur justificatif."}];
  if(!Array.isArray(m.motifs)||!m.motifs.length)m.motifs=DEFAULT_MOTIFS.slice();
  m.distances=m.distances||{};
  return m;
}
const motifsList=()=>conf().motifs;
function bareme(date){const l=conf().baremes.slice().sort((a,b)=>(a.depuis||"").localeCompare(b.depuis||""));let b=l[0];for(const x of l)if(!date||!x.depuis||x.depuis<=date)b=x;return{km:n(b.km),repasMax:n(b.repasMax),depuis:b.depuis,id:b.id}}
const bareTxtCourt=b=>`${n(b.km).toFixed(2).replace(".",",")} €/km · péage, parking au réel · repas max. ${eurPdf(b.repasMax)}`;
const bareTxt=b=>`${n(b.km).toFixed(2).replace(".",",")} €/km · péages et parking au réel · repas réel plafonné à ${eurPdf(b.repasMax)}`;

/* ============ Le déclarant ============ */
function prof(u=ME){
  const p=u.frais=u.frais||{};
  p.distances=p.distances||{};p.trajets=p.trajets||[];
  if(p.autoDep===undefined)p.autoDep=true;
  if(!p.depart)p.depart="dom";
  if(!p.adresse&&u.adresse)p.adresse=u.adresse;
  if(!p._init){p._init=1;const per=u.pid&&P.get(u.pid);
    if(per&&!p.adresse)p.adresse=[per.adresse,[per.cp,per.ville].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    if(per&&!p.uai){const a=(per.affectations||[]).find(x=>x.principal)||(per.affectations||[])[0];if(a&&a.uai)p.uai=a.uai}
    if(!p.trajets.length&&/^DENAGE$/i.test((per&&per.nom)||u.nom||""))p.trajets=clone(DEFAULT_TRAJETS);
  }
  return p;
}
function fonctionAuto(per){
  const ms=per?Mandats.de(per).map(m=>m.type):[];
  if(ms.includes("S3"))return "Secrétaire académique";if(ms.includes("S3A"))return "Secrétaire académique adjoint";
  if(ms.includes("TRES")||ms.includes("TRESA"))return per.civilite==="M."?"Trésorier":"Trésorière";
  if(ms.includes("S2")||ms.includes("S2A"))return "Secrétaire départemental";
  if((per&&Mandats.de(per)||[]).some(m=>m.type==="REP"&&/CAP|commission paritaire/i.test(m.precision||m.instance||"")))return "Commissaire paritaire";
  return "Adhérent";
}
function ident(u=ME){
  const per=u&&u.pid&&P.get(u.pid);const pr=prof(u);
  return{nom:((per&&per.nom)||u.nom||"").toUpperCase(),prenom:(per&&per.prenom)||u.prenom||"",email:(per&&per.email)||u.email||"",fonction:pr.fonction||fonctionAuto(per),uid:u.id};
}
function tresoriere(){
  const x=(typeof Mandats!=="undefined"?Mandats.actifs():[]).find(y=>y.m.type==="TRES");
  if(x)return{nom:[x.p.prenom,(x.p.nom||"").toUpperCase()].filter(Boolean).join(" "),email:x.p.email||"",pid:x.p.id};
  const u=D.users.find(v=>v.role==="tresorier"&&v.actif!==false);if(u)return{nom:(u.prenom+" "+u.nom).trim(),email:u.email||""};
  return D.meta.fraisTresoriere||{nom:"",email:""};
}

/* ============ Fiches ============ */
const all=()=>D.fraisFiches=D.fraisFiches||[];
const mine=()=>all().filter(f=>f.userId===ME.id);
const get=id=>all().find(f=>f.id===id);
function newDep(date=""){return{id:uid(),date,motif:"",motifAutre:"",mode:"points",pts:[],retour:null,legs:[],aller:"",allerKm:0,retourKm:0,passager:false,conducteur:"",peageA:0,peageR:0,parkA:0,parkR:0,repas:[],auto:true,reunionId:"",note:""}}
function newFiche(mois){const d=mois?new Date(+mois.slice(0,4),+mois.slice(5,7)-1,1):new Date();const m=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
  return{id:"f"+uid(),userId:ME.id,decl:ident(),mois:m,titre:"Fiche du "+fdate(today()),dateDecl:today(),statut:"brouillon",envoyeLe:"",commentaire:"",payeeLe:"",hist:[],deps:[],autres:{postal:0,internet:0,divers:0,diversTxt:""},pieces:[],createdAt:Date.now(),maj:Date.now()}}
const st={tab:"deps",cur:null,jobs:[],cutMode:"auto",pendingDep:null,tf:{m:"",p:"",s:""}};
const cur=()=>{const f=get(st.cur);return f&&f.userId===ME.id?f:null};
let _t=null;
function touch(f){if(f){f.maj=Date.now();f.decl=f.decl&&f.statut!=="brouillon"?f.decl:ident(D.users.find(u=>u.id===f.userId)||ME)}clearTimeout(_t);_t=setTimeout(()=>save(),400)}
const saveCur=()=>touch(cur());
function periode(f){const ds=(f.deps||[]).map(d=>d.date).filter(Boolean).sort();if(!ds.length)return "";return ds[0]===ds[ds.length-1]?"le "+fdate(ds[0]):"du "+fdate(ds[0])+" au "+fdate(ds[ds.length-1])}
function ficheMois(mois,creer){ // fiche en cours = brouillon ouvert (ou le plus récent), quel que soit le mois : une fiche regroupe tous les frais depuis la précédente
  let f=(cur()&&cur().statut==="brouillon"?cur():null)||mine().filter(x=>x.statut==="brouillon").sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0];if(!f&&creer){f=newFiche(mois);all().push(f);touch(f)}return f}

/* ============ Distances ============ */
function ptKey(p,u=ME){if(!p)return "";if(p.k==="dom")return "dom:"+u.id;if(p.k==="etab")return "etab:"+p.ref;if(p.k==="lieu")return "lieu:"+p.ref;return "adr:"+norm(p.adr||p.label||"")}
const pairKey=(a,b)=>[a,b].sort().join("|");
function distConnue(ka,kb){const k=pairKey(ka,kb),pe=prof().distances[k];if(pe&&n(pe.km))return{km:n(pe.km),src:pe.src==="calc"?"calculé le "+fdate(pe.le):"ma table ("+fdate(pe.le)+")"};const co=conf().distances[k];if(co&&n(co.km))return{km:n(co.km),src:"table commune"};return null}
function memoDist(ka,kb,km,src){prof().distances[pairKey(ka,kb)]={km:n(km),src,le:today()};touch(null)}
function etabDe(uai){return D.etablissements.find(e=>e.uai===uai)}
function ptLabel(p,u=ME){if(!p)return "";if(p.k==="dom"){const a=prof(u).adresse||"";const v=a.split(",").pop().replace(/\d{5}/,"").trim();return "Domicile"+(v?" ("+v+")":"")}
  if(p.k==="etab"){const e=etabDe(p.ref);return e?e.nom+(e.ville?" ("+e.ville+")":""):(p.label||p.ref)}
  if(p.k==="lieu"){const l=lieux().find(x=>x.id===p.ref);return l?l.nom+(l.ville?" ("+l.ville+")":""):(p.label||"")}
  return p.adr||p.label||"";}
function lieux(){return typeof ReuDocs!=="undefined"?ReuDocs.lieux():(conf().lieux=conf().lieux||[])}
async function coordPt(p){
  if(p.k==="etab"){const e=etabDe(p.ref);if(e&&Geo.coordOk(e))return{lat:+e.lat,lon:+e.lon};if(e){const g=await Geo.etab(e);e.lat=g.lat;e.lon=g.lon;return g}}
  if(p.k==="lieu"){const l=lieux().find(x=>x.id===p.ref);if(l){if(l.lat)return{lat:+l.lat,lon:+l.lon};const g=await Geo.geocode([l.adresse,l.cp,l.ville].filter(Boolean).join(" "));l.lat=g.lat;l.lon=g.lon;return g}}
  if(p.k==="dom"){const a=prof().adresse;if(!a)throw new Error("adresse du domicile non renseignée (onglet Réglages)");return Geo.geocode(a)}
  if(p.adr)return Geo.geocode(p.adr);
  throw new Error("lieu sans adresse");
}
async function calcLeg(pa,pb){const a=await coordPt(pa),b=await coordPt(pb);return Geo.itineraire(a,b)}
function seq(d){const pts=(d.pts||[]).filter(Boolean);if(!pts.length)return[];const ret=d.retour||pts[0];return pts.concat(pts.length>1||d.retour?[ret]:[])}
function rebuildLegs(d){
  const s=seq(d),old=d.legs||[];const legs=[];
  for(let i=0;i+1<s.length;i++){const ka=ptKey(s[i]),kb=ptKey(s[i+1]);if(!ka||!kb||ka===kb)continue;
    const ex=old.find(l=>l.a===ka&&l.b===kb)||old.find(l=>l.a===kb&&l.b===ka);
    if(ex)legs.push(Object.assign({},ex,{a:ka,b:kb,la:ptLabel(s[i]),lb:ptLabel(s[i+1])}));
    else{const k=distConnue(ka,kb);legs.push({a:ka,b:kb,la:ptLabel(s[i]),lb:ptLabel(s[i+1]),km:k?k.km:null,src:k?k.src:"",i})}}
  d.legs=legs;return legs;
}
async function autoCalc(f,d){
  if(!navigator.onLine)return;const s=seq(d);let chg=false;
  for(const l of d.legs||[]){if(l.km!=null||l._calc)continue;l._calc=1;
    const pa=s.find(p=>ptKey(p)===l.a),pb=s.find(p=>ptKey(p)===l.b);if(!pa||!pb)continue;
    try{const km=await calcLeg(pa,pb);l.km=km;l.src="calculé le "+fdate(today());memoDist(l.a,l.b,km,"calc");chg=true}catch(e){l.err=e.message;chg=true}
    delete l._calc;await sleep(250)}
  if(chg){touch(f);if(st.tab==="deps")renderView()}
}
const kmBrut=d=>d.mode==="hab"?n(d.allerKm)+n(d.retourKm):(d.legs||[]).reduce((a,l)=>a+n(l.km),0);

/* ============ Calculs ============ */
function repasOk(m,f){return m.papier||(m.pieceId&&f&&f.pieces.some(p=>p.id===m.pieceId))}
function depCalc(d,f=cur()){
  const b=bareme(d.date);const kb=kmBrut(d);const km=d.passager?0:kb;
  const ik=r2(km*b.km);
  const peages=r2(n(d.peageA)+n(d.peageR)),parking=r2(n(d.parkA)+n(d.parkR));
  const rl=(d.repas||[]);const repas=r2(rl.filter(m=>repasOk(m,f)).reduce((a,m)=>a+Math.min(n(m.montant),b.repasMax),0));
  return{km,kmBrut:kb,ik,peages,parking,repas,nbRepas:rl.length,total:r2(ik+peages+parking+repas),b};
}
function ficheCalc(f){
  const deps=f.deps.map(d=>depCalc(d,f));
  const autres=r2(n(f.autres.postal)+n(f.autres.internet)+n(f.autres.divers));
  const sum=k=>r2(deps.reduce((a,c)=>a+c[k],0));
  return{deps,km:sum("km"),ik:sum("ik"),peages:sum("peages"),parking:sum("parking"),repas:sum("repas"),depsTotal:sum("total"),autres,total:r2(sum("total")+autres)};
}
const sortedDeps=f=>f.deps.slice().sort((a,b)=>(a.date||"9999").localeCompare(b.date||"9999"));
const motifTxt=d=>d.motif==="Autre"?(d.motifAutre||"Autre"):(d.motif||"");
function depLabel(d,f){const i=sortedDeps(f).indexOf(d)+1;return `D${i} · ${d.date?fdate(d.date):"date ?"} · ${motifTxt(d)||"Motif à préciser"}`}
function trajetTxt(d){
  if(d.mode==="hab"){const a=d.aller||"",r=d.retourHab||"";if(!a&&!r)return "";if(a===r||!r)return a+(n(d.retourKm)?" (A/R)":"");return [a,r].filter(Boolean).join(" / ")}
  const s=seq(d).map(p=>ptLabel(p,D.users.find(u=>u.id===(cur()||{}).userId)||ME));return s.join(" → ")+(d.passager?` (passager${d.conducteur?" de "+d.conducteur:""})`:"");
}
/* Numérotation des pièces : par déplacement (ordre chronologique), puis autres frais, puis non affectées */
function pieceOrder(f){
  const out=[];const byTime=(a,b)=>((a.date||"")+(a.heure||"")).localeCompare((b.date||"")+(b.heure||""));
  sortedDeps(f).forEach(d=>f.pieces.filter(p=>p.depId===d.id).sort(byTime).forEach(p=>out.push(p)));
  f.pieces.filter(p=>p.depId==="autres").sort(byTime).forEach(p=>out.push(p));
  f.pieces.filter(p=>!p.depId||(p.depId!=="autres"&&!f.deps.some(d=>d.id===p.depId))).sort(byTime).forEach(p=>out.push(p));
  const ref={};out.forEach((p,i)=>ref[p.id]="J"+(i+1));return{list:out,ref};
}
const isAssigned=(p,f)=>p.depId==="autres"||f.deps.some(d=>d.id===p.depId);
/* Report automatique des montants des justificatifs vers le déplacement */
function applyAuto(f,dep){
  if(!dep)return;
  const ps=f.pieces.filter(p=>p.depId===dep.id);
  dep.repas=(dep.repas||[]).filter(m=>m.manuel||(m.pieceId&&ps.some(p=>p.id===m.pieceId&&p.type==="restaurant")));
  if(!dep.auto)return;
  const sum=(type,sens)=>r2(ps.filter(p=>p.type===type&&((p.sens==="retour")===(sens==="retour"))).reduce((a,p)=>a+n(p.montant),0));
  if(ps.some(p=>p.type==="peage")){dep.peageA=sum("peage","aller");dep.peageR=sum("peage","retour")}
  if(ps.some(p=>p.type==="parking")){dep.parkA=sum("parking","aller");dep.parkR=sum("parking","retour")}
  ps.filter(p=>p.type==="restaurant").forEach(p=>{const ex=dep.repas.find(m=>m.pieceId===p.id);if(ex)ex.montant=n(p.montant);else dep.repas.push({id:"r"+uid(),pieceId:p.id,montant:n(p.montant)})});
}
function applyAutoAll(f){f.deps.forEach(d=>applyAuto(f,d))}
function guessSens(heure){if(!heure)return "aller";const h=parseInt(heure.split(":")[0],10);return h<13?"aller":"retour"}

/* ============ Photos (IndexedDB de cet appareil) ============ */
const Store={idb:null,urls:new Map(),_mem:null,
  async init(){if(this.idb!==null)return;await withTimeout(this.openIdb(),5000,null)},
  openIdb(){return new Promise(res=>{try{const rq=indexedDB.open("snetaa-frais-photos",1);rq.onupgradeneeded=()=>{rq.result.createObjectStore("blobs")};rq.onsuccess=()=>{this.idb=rq.result;res()};rq.onerror=()=>{this.idb=false;res()}}catch(e){this.idb=false;res()}})},
  idbOp(store,mode,fn){return new Promise((res,rej)=>{if(!this.idb)return res(undefined);const tx=this.idb.transaction(store,mode);const s=tx.objectStore(store);const r=fn(s);tx.oncomplete=()=>res(r&&r.result);tx.onerror=()=>rej(tx.error)})},
  async putImage(blob){const id="L"+uid();await this.idbOp("blobs","readwrite",s=>s.put(blob,id));if(!this.idb)this._mem=(this._mem||new Map()).set(id,blob);this.urls.set(id,URL.createObjectURL(blob));return id},
  url(id){if(!id)return "";if(this.urls.has(id))return this.urls.get(id);
    if(!this._loading)this._loading=new Set();if(!this._loading.has(id)){this._loading.add(id);this.idbOp("blobs","readonly",s=>s.get(id)).then(b=>{if(b){this.urls.set(id,URL.createObjectURL(b));document.querySelectorAll('img[data-img="'+id+'"]').forEach(i=>{i.src=this.urls.get(id);i.classList.remove("absent")})}else document.querySelectorAll('img[data-img="'+id+'"]').forEach(i=>i.classList.add("absent"))}).catch(()=>{})}
    return "data:image/gif;base64,R0lGODlhAQABAAAAACw=";},
  async blob(id){const b=await this.idbOp("blobs","readonly",s=>s.get(id));if(b)return b;if(this._mem&&this._mem.get(id))return this._mem.get(id);throw new Error("photo absente de cet appareil")},
  async has(id){try{await this.blob(id);return true}catch(_){return false}},
  async delImage(id){if(!id)return;try{await this.idbOp("blobs","readwrite",s=>s.delete(id))}catch(e){}}
};
const imgTag=(id,alt="")=>`<img data-img="${esc(id)}" src="${esc(Store.url(id))}" alt="${esc(alt)}" loading="lazy">`;

/* ============ Bibliothèques servies par le site (mises en cache par le service worker) ============ */
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("chargement d'un module impossible ("+src.split("/").pop()+") : vérifie la connexion pour la première utilisation"));document.head.appendChild(s)})}
const LIBS={pdfjs:LIB+"pdf.min.js",tesseract:LIB+"tesseract.min.js",qrcode:LIB+"qrcode.js",jsqr:LIB+"jsQR.js",jspdf:"lib/jspdf.umd.min.js"};
const libLoaded={};
function runLib(id){if(!libLoaded[id])libLoaded[id]=loadScript(LIBS[id]).catch(e=>{delete libLoaded[id];throw e});return libLoaded[id]}
const absUrl=p=>new URL(p,location.href).href;
function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error("Image illisible"));i.src=src})}
async function fileToCanvas(file,max=2400){
  let src;try{src=await createImageBitmap(file,{imageOrientation:"from-image"})}catch(_){const u=URL.createObjectURL(file);src=await loadImg(u)}
  const w=src.width,h=src.height,s=Math.min(1,max/Math.max(w,h));
  const c=document.createElement("canvas");c.width=Math.round(w*s);c.height=Math.round(h*s);
  const x=c.getContext("2d",{willReadFrequently:true});x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(src,0,0,c.width,c.height);return c;
}
const toBlob=(c,type="image/jpeg",q=.86)=>new Promise(r=>c.toBlob(r,type,q));
function scaled(c,max){const s=Math.min(1,max/Math.max(c.width,c.height));if(s===1)return c;const o=document.createElement("canvas");o.width=Math.round(c.width*s);o.height=Math.round(c.height*s);o.getContext("2d").drawImage(c,0,0,o.width,o.height);return o}
/* homographie : points destination (rectangle) -> source (quadrilatère) */
function solveH(dst,src){
  const A=[],B=[];
  for(let i=0;i<4;i++){const [u,v]=dst[i],[x,y]=src[i];
    A.push([u,v,1,0,0,0,-u*x,-v*x]);B.push(x);A.push([0,0,0,u,v,1,-u*y,-v*y]);B.push(y)}
  const N=8;for(let c=0;c<N;c++){let m=c;for(let r=c+1;r<N;r++)if(Math.abs(A[r][c])>Math.abs(A[m][c]))m=r;
    [A[c],A[m]]=[A[m],A[c]];[B[c],B[m]]=[B[m],B[c]];const p=A[c][c]||1e-12;
    for(let r=0;r<N;r++){if(r===c)continue;const k=A[r][c]/p;if(!k)continue;for(let j=c;j<N;j++)A[r][j]-=k*A[c][j];B[r]-=k*B[c]}}
  return B.map((b,i)=>b/A[i][i]).concat(1);
}
const srcCache=new Map();
async function getSrcCanvas(id){
  if(srcCache.has(id))return srcCache.get(id);
  const blob=await Store.blob(id);const c=await fileToCanvas(blob,2600);
  if(srcCache.size>6)srcCache.delete(srcCache.keys().next().value);srcCache.set(id,c);return c;
}
function warp(src,cornersN,rot=0,enhance=true,maxSide=1500){
  const W=src.width,H=src.height;const P=cornersN.map(([x,y])=>[x*W,y*H]);
  const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  let ow=(dist(P[0],P[1])+dist(P[3],P[2]))/2,oh=(dist(P[0],P[3])+dist(P[1],P[2]))/2;
  const s=Math.min(1,maxSide/Math.max(ow,oh,1));ow=Math.max(8,Math.round(ow*s));oh=Math.max(8,Math.round(oh*s));
  const h=solveH([[0,0],[ow,0],[ow,oh],[0,oh]],P);
  const sd=src.getContext("2d").getImageData(0,0,W,H).data;
  const out=new ImageData(ow,oh);const od=out.data;
  for(let v=0;v<oh;v++){for(let u=0;u<ow;u++){
    const z=h[6]*u+h[7]*v+1;let x=(h[0]*u+h[1]*v+h[2])/z,y=(h[3]*u+h[4]*v+h[5])/z;
    if(x<0)x=0;if(y<0)y=0;if(x>W-1.001)x=W-1.001;if(y>H-1.001)y=H-1.001;
    const x0=x|0,y0=y|0,fx=x-x0,fy=y-y0;const i00=(y0*W+x0)*4,i10=i00+4,i01=i00+W*4,i11=i01+4;const o=(v*ow+u)*4;
    for(let k=0;k<3;k++)od[o+k]=(sd[i00+k]*(1-fx)+sd[i10+k]*fx)*(1-fy)+(sd[i01+k]*(1-fx)+sd[i11+k]*fx)*fy;
    od[o+3]=255}}
  if(enhance){/* "effet scan" : niveaux de gris + étirement du contraste */
    const hist=new Uint32Array(256);for(let i=0;i<od.length;i+=4){const l=(od[i]*.299+od[i+1]*.587+od[i+2]*.114)|0;od[i]=l;hist[l]++}
    const tot=ow*oh;let lo=0,hi=255,acc=0;for(let i=0;i<256;i++){acc+=hist[i];if(acc>tot*.01){lo=i;break}}acc=0;for(let i=255;i>=0;i--){acc+=hist[i];if(acc>tot*.04){hi=i;break}}
    const rng=Math.max(20,hi-lo);for(let i=0;i<od.length;i+=4){let l=(od[i]-lo)*255/rng;l=l<0?0:l>255?255:l;l=255*Math.pow(l/255,1.15);od[i]=od[i+1]=od[i+2]=l}}
  let c=document.createElement("canvas");c.width=ow;c.height=oh;c.getContext("2d").putImageData(out,0,0);
  rot=((rot%4)+4)%4;if(rot){const r=document.createElement("canvas");r.width=rot%2?oh:ow;r.height=rot%2?ow:oh;const x=r.getContext("2d");x.translate(r.width/2,r.height/2);x.rotate(rot*Math.PI/2);x.drawImage(c,-ow/2,-oh/2);c=r}
  return c;
}
const FULL=[[0,0],[1,0],[1,1],[0,1]];
/* Affinage local du détourage : recherche du papier clair autour de la zone proposée,
   rectangle d'aire minimale, puis on garde l'orientation (ordre de lecture) proposée. */
function quadArea(q){let a=0;for(let i=0;i<4;i++){const [x1,y1]=q[i],[x2,y2]=q[(i+1)%4];a+=x1*y2-x2*y1}return Math.abs(a)/2}
function refineCorners(src,cornersN,loose=false){
  try{
    const sm=scaled(src,800),W=sm.width,H=sm.height;const d=sm.getContext("2d",{willReadFrequently:true}).getImageData(0,0,W,H).data;
    const L=new Uint8Array(W*H);const hist=new Uint32Array(256);
    for(let i=0,j=0;i<L.length;i++,j+=4){const l=(d[j]*.299+d[j+1]*.587+d[j+2]*.114)|0;L[i]=l;hist[l]++}
    // seuil d'Otsu
    let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let sB=0,wB=0,best=0,thr=128;const tot=L.length;
    for(let t=0;t<256;t++){wB+=hist[t];if(!wB)continue;const wF=tot-wB;if(!wF)break;sB+=t*hist[t];const mB=sB/wB,mF=(sum-sB)/wF;const v=wB*wF*(mB-mF)*(mB-mF);if(v>best){best=v;thr=t}}
    const Q=cornersN.map(([x,y])=>[x*W,y*H]);
    const xs=Q.map(p=>p[0]),ys=Q.map(p=>p[1]);const bw=Math.max(...xs)-Math.min(...xs),bh=Math.max(...ys)-Math.min(...ys);
    const x0=Math.max(0,Math.floor(Math.min(...xs)-bw*.25)),x1=Math.min(W-1,Math.ceil(Math.max(...xs)+bw*.25)),y0=Math.max(0,Math.floor(Math.min(...ys)-bh*.25)),y1=Math.min(H-1,Math.ceil(Math.max(...ys)+bh*.25));
    const cx=xs.reduce((a,b)=>a+b)/4,cy=ys.reduce((a,b)=>a+b)/4;
    // graine : pixel clair le plus proche du centre
    let seed=-1;for(let r=0;r<Math.max(bw,bh)/2&&seed<0;r+=2){for(let a=0;a<16&&seed<0;a++){const x=Math.round(cx+r*Math.cos(a*Math.PI/8)),y=Math.round(cy+r*Math.sin(a*Math.PI/8));if(x>=x0&&x<=x1&&y>=y0&&y<=y1&&L[y*W+x]>thr)seed=y*W+x}}
    if(seed<0)return null;
    const seen=new Uint8Array(W*H);const stack=[seed];seen[seed]=1;const minX=new Int32Array(H).fill(1e9),maxX=new Int32Array(H).fill(-1);let count=0,touch=0;
    while(stack.length){const i=stack.pop();const x=i%W,y=(i/W)|0;count++;if(x<minX[y])minX[y]=x;if(x>maxX[y])maxX[y]=x;if(x===x0||x===x1||y===y0||y===y1)touch++;
      if(x>x0){const k=i-1;if(!seen[k]&&L[k]>thr){seen[k]=1;stack.push(k)}}
      if(x<x1){const k=i+1;if(!seen[k]&&L[k]>thr){seen[k]=1;stack.push(k)}}
      if(y>y0){const k=i-W;if(!seen[k]&&L[k]>thr){seen[k]=1;stack.push(k)}}
      if(y<y1){const k=i+W;if(!seen[k]&&L[k]>thr){seen[k]=1;stack.push(k)}}}
    if(touch>(x1-x0+y1-y0)*0.6)return null; // le papier déborde : fond clair, on ne touche à rien
    const pts=[];for(let y=y0;y<=y1;y++)if(maxX[y]>=0){pts.push([minX[y],y],[maxX[y]+1,y],[minX[y],y+1],[maxX[y]+1,y+1])}
    if(pts.length<12)return null;
    // enveloppe convexe (chaîne monotone)
    pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
    const lo=[],up=[];for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
    for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
    const hull=lo.slice(0,-1).concat(up.slice(0,-1));
    // rectangle d'aire minimale
    let bestR=null,bestA=Infinity;
    for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];const len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<1e-6)continue;
      const ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len;let mnU=Infinity,mxU=-Infinity,mnV=Infinity,mxV=-Infinity;
      for(const p of hull){const u=p[0]*ux+p[1]*uy,v=-p[0]*uy+p[1]*ux;if(u<mnU)mnU=u;if(u>mxU)mxU=u;if(v<mnV)mnV=v;if(v>mxV)mxV=v}
      const A=(mxU-mnU)*(mxV-mnV);if(A<bestA){bestA=A;const P=(u,v)=>[u*ux-v*uy,u*uy+v*ux];bestR=[P(mnU,mnV),P(mxU,mnV),P(mxU,mxV),P(mnU,mxV)]}}
    if(!bestR)return null;
    const ratio=bestA/Math.max(1,quadArea(Q));if(!loose&&(ratio<.55||ratio>1.7))return null;if(loose&&ratio<.03)return null;
    // remplissage : un ticket est plein, une forme irrégulière (plusieurs papiers collés) non
    if(count/bestA<.6)return null;
    // garder l'orientation (sens de lecture) proposée : meilleur décalage circulaire
    if(cr(bestR[0],bestR[1],bestR[2])<0)bestR.reverse();
    let bs=0,bd=Infinity;for(let s=0;s<4;s++){let dd=0;for(let i=0;i<4;i++){const r=bestR[(i+s)%4];dd+=Math.hypot(r[0]-Q[i][0],r[1]-Q[i][1])}if(dd<bd){bd=dd;bs=s}}
    const R=[0,1,2,3].map(i=>bestR[(i+bs)%4]);const mx=R.reduce((a,p)=>a+p[0],0)/4,my=R.reduce((a,p)=>a+p[1],0)/4;
    return R.map(([x,y])=>[Math.min(1,Math.max(0,(mx+(x-mx)*1.01)/W)),Math.min(1,Math.max(0,(my+(y-my)*1.01)/H))]);
  }catch(e){console.warn(e);return null}
}

/* ============ Modules embarqués (fonctionnent sans connexion) ============ */
/* ============ PDF -> images ============ */
let pdfjsP=null;
function getPdfjs(){if(!pdfjsP)pdfjsP=(async()=>{await runLib("pdfjs");window.pdfjsLib.GlobalWorkerOptions.workerSrc=absUrl(LIB+"pdf.worker.min.js");return window.pdfjsLib})().catch(e=>{pdfjsP=null;throw e});return pdfjsP}
async function pdfToCanvases(file,maxPages=6){
  const lib=await getPdfjs();const doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const out=[];let text="";
  for(let i=1;i<=Math.min(doc.numPages,maxPages);i++){const pg=await doc.getPage(i);
    if(i===1){try{const tc=await pg.getTextContent();text=tc.items.map(it=>it.str+(it.hasEOL?"\n":" ")).join("")}catch(_){}}
    const vp0=pg.getViewport({scale:1});const sc=Math.min(2.2,1800/Math.max(vp0.width,vp0.height));const vp=pg.getViewport({scale:sc});
    const c=document.createElement("canvas");c.width=Math.round(vp.width);c.height=Math.round(vp.height);const x=c.getContext("2d",{willReadFrequently:true});x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);await pg.render({canvasContext:x,viewport:vp}).promise;out.push(c)}
  return{pages:out,total:doc.numPages,text};
}

/* ============ Lecture des textes (OCR Tesseract, en local) ============ */
/* ============ Lecture des textes (OCR Tesseract 5.1.1, sur l'appareil, un seul worker) ============ */
let ocrP=null,ocrLog=null;
function getOcr(){
  if(!ocrP)ocrP=(async()=>{
    await runLib("tesseract");
    const w=await window.Tesseract.createWorker("fra",1,{workerPath:absUrl(LIB+"worker.min.js"),corePath:absUrl(LIB+"tesseract-core"),langPath:absUrl(LIB+"lang"),gzip:true,
      logger:m=>{if(ocrLog&&m&&m.status==="recognizing text"&&typeof m.progress==="number")ocrLog(m.progress)}});
    try{await w.setParameters({tessedit_pageseg_mode:"4",preserve_interword_spaces:"1"})}catch(_){}
    return w;
  })().catch(e=>{ocrP=null;throw e});
  return ocrP;
}
function rotCanvas(c,rot){rot=((rot%4)+4)%4;if(!rot)return c;const r=document.createElement("canvas");r.width=rot%2?c.height:c.width;r.height=rot%2?c.width:c.height;const x=r.getContext("2d");x.translate(r.width/2,r.height/2);x.rotate(rot*Math.PI/2);x.drawImage(c,-c.width/2,-c.height/2);return r}
/* Sens des lignes de texte : 0 = horizontales, 1 = verticales (profils d'encre) */
function textAxis(c){
  const S=256,s=document.createElement("canvas");s.width=S;s.height=S;const x=s.getContext("2d",{willReadFrequently:true});x.fillStyle="#fff";x.fillRect(0,0,S,S);x.drawImage(c,0,0,S,S);
  const d=x.getImageData(0,0,S,S).data;const rows=new Float64Array(S),cols=new Float64Array(S);
  for(let y=0;y<S;y++)for(let i=0;i<S;i++){const k=(y*S+i)*4;if(d[k]*.3+d[k+1]*.59+d[k+2]*.11<120){rows[y]++;cols[i]++}}
  const v=a=>{let m=0;for(const z of a)m+=z;m/=a.length;if(!m)return 0;let q=0;for(let i=1;i<a.length;i++)q+=Math.abs(a[i]-a[i-1]);return q/(m*a.length)};
  return v(cols)>v(rows)*1.15?1:0;
}
function ocrScore(data){const ws=(data.words||[]).filter(w=>/[A-Za-zÀ-ÿ]{3,}|\d{2}/.test(w.text));if(!ws.length)return 0;const m=ws.reduce((a,w)=>a+w.confidence,0)/ws.length;return m*Math.min(1,ws.length/6)}
async function ocrBest(warped,upd){
  const axis=textAxis(warped);const cands=axis?[1,3]:[0,2];
  let worker=null;try{if(!ocrP)upd&&upd("préparation de la lecture des textes…");worker=await getOcr()}catch(e){console.warn(e);return{rot:cands[0],text:"",ok:false}}
  const base=scaled(warped,1400);let best=null;
  const tryRot=async r=>{const res=await worker.recognize(rotCanvas(base,r));const sc=ocrScore(res.data);if(!best||sc>best.sc)best={rot:r,sc,text:res.data.text||""};return sc};
  for(const r of cands){const sc=await tryRot(r);if(r===cands[0]&&sc>=72)break}
  // sens des lignes mal deviné : on essaie les deux autres orientations
  if(best.sc<55){upd&&upd("recherche du sens de lecture…");for(const r of (axis?[0,2]:[1,3])){const sc=await tryRot(r);if(sc>=72)break}}
  return{rot:best.rot,text:best.text,ok:true,score:best.sc};
}
async function ocrPlain(canvas){try{const w=await getOcr();const r=await w.recognize(scaled(canvas,1800));return r.data.text||""}catch(e){console.warn(e);return ""}}

/* ============ Analyse du texte : type, date, heure, montant ============ */
const MOIS_RX="JANVIER|FEVRIER|MARS|AVRIL|MAI|JUIN|JUILLET|AOUT|SEPTEMBRE|OCTOBRE|NOVEMBRE|DECEMBRE";
const KW={
  peage:["PEAGE","AUTOROUTE","APRR","VINCI","SANEF","COFIROUTE","ASF ","AREA","CLASSE 1","CLASSE1","GARE DE","BARRIERE","A71","A10","A20","A85","A19","A11"],
  parking:["VOIE PUBLIQUE","ORLEANS GESTION","HDU","PARKING","STATIONNEMENT","HORODATEUR","INDIGO","EFFIA","Q-PARK","QPARK","SAEMES","DUREE","DUREE DE","ENTREE","PARC "],
  restaurant:["MCDONALD","BURGER KING","KFC","QUICK","PATAPAIN","CHICKEN","WOK","SUR PLACE","A EMPORTER","NAF 5610","APE 5610","5610C","5610A","CROUSTY","FRITE","SUBWAY","BRIOCHE DOREE","COURTEPAILLE","BUFFALO","FLUNCH","RESTAURANT","BRASSERIE","BISTRO","MENU","PLAT DU JOUR","COUVERT","TABLE","SERVEUR","CAFE","DESSERT","BOISSON","PIZZ","BURGER","SANDWICH","FORMULE","RESTAU","CREPERIE","TRAITEUR","BOULANGERIE"],
  carburant:["CARBURANT","GAZOLE","GASOIL","SP95","SP98","SP 95","SP 98","E10","E85","LITRES","LITRE","POMPE","STATION SERVICE","DIESEL"],
  transport:["SNCF","TER ","TGV","BILLET DE TRAIN","VOYAGEUR","TRAIN","AUTOCAR","REMI","OUIGO","CARTE AVANTAGE"],
  hebergement:["HOTEL","CHAMBRE","NUITEE","TAXE DE SEJOUR","PETIT DEJEUNER","IBIS","B&B","CAMPANILE","KYRIAD"],
  convocation:["CONVOCATION","CONVOQUE","ORDRE DU JOUR","RECTORAT","DSDEN","ACADEMIE","MADAME, MONSIEUR","OBJET","SEANCE","REUNION","AUTORISATION D'ABSENCE","INSPECTION ACADEMIQUE","SNETAA","SECRETAIRE GENERAL"],
  postal:["LA POSTE","AFFRANCHISSEMENT","LETTRE RECOMMANDEE","COLISSIMO","TIMBRE","LETTRE VERTE"],
  telephonie:["ORANGE","SFR","BOUYGUES","FREE MOBILE","FORFAIT","FACTURE MOBILE","ABONNEMENT","INTERNET"]
};
/* émetteurs connus : reconnus d'emblée (et ceux que le déclarant a appris à l'application, prioritaires) */
const EMETTEURS=[
  [/VIN[CG][I1L]|COFIROUTE|\bASF\b|ESCOTA|ARCOUR/,"VINCI Autoroutes","peage"],[/\bAPRR\b|\bAREA\b/,"APRR","peage"],[/SANEF|\bSAPN\b/,"SANEF","peage"],[/ATLANDES/,"Atlandes","peage"],[/\bALIENOR\b|\bA65\b/,"A'liénor","peage"],
  [/ORL[EÉ]?ANS\W{0,3}GEST|[\W_]HDU\b|VOIE PUBLIQUE[\s\S]*(NO AUTO|TICKET CLIENT)|(NO AUTO|TICKET CLIENT)[\s\S]*VOIE PUBLIQUE/,"Orléans Gestion","parking"],
  [/INDIGO/,"Indigo","parking"],[/EFFIA/,"Effia","parking"],[/Q-?PARK/,"Q-Park","parking"],[/SAEMES/,"Saemes","parking"],[/INTERPARKING/,"Interparking","parking"],[/ONEPARK/,"Onepark","parking"],
  [/MC ?DONALD/,"McDonald's","restaurant"],[/BURGER KING/,"Burger King","restaurant"],[/\bKFC\b/,"KFC","restaurant"],[/\bQUICK\b/,"Quick","restaurant"],[/PATAPA[I1T]N/,"Patapain","restaurant"],[/CHICKEN TEK/,"Chicken Tek","restaurant"],[/SUBWAY/,"Subway","restaurant"],[/BRIOCHE DOREE/,"Brioche Dorée","restaurant"],[/COURTEPAILLE/,"Courtepaille","restaurant"],
  [/\bSNCF\b|OUIGO/,"SNCF","transport"],[/LA POSTE/,"La Poste","postal"]];
function regleEmetteur(T){
  const perso=(typeof ME!=="undefined"&&ME?prof().emetteurs||[]:[]);
  for(const r of perso){const mots=String(r.mot||"").split(/[;,]/).map(x=>normTxt(x).trim()).filter(Boolean);if(mots.length&&mots.every(m=>T.includes(m)))return{emetteur:r.emetteur,type:r.type||"",sens:r.sens||"",perso:true}}
  for(const [rx,e,t] of EMETTEURS)if(rx.test(T))return{emetteur:e,type:t};
  return null;
}
const MOTS_VIDES=new Set("TICKET CONSERVER CLIENT CARTE BANCAIRE MONTANT TOTAL TOTAUX PAIEMENT DEBIT EUROS SIRET FRANCE MERCI BIENVENUE NOMBRE LIGNE LIGNES CODE TAUX PRIX CLASSE ENTREE SORTIE CAISSE COMMANDE VENDEUR DATE HEURE PUBLIQUE JETER VOIE DUPLICATA DOCUMENT ORIGINAL VERSION IMPRESSION CONTACT MASTERCARD COMPTANT".split(" "));
function motCle(p){const T=normTxt(p.ocr||"");if(!T)return "";const E=normTxt(p.emetteur||"").split(/[^A-Z0-9]+/).filter(w=>w.length>=4&&T.includes(w));if(E.length)return E.slice(0,2).join(" ; ");
  const cnt={};(T.match(/[A-Z]{5,}/g)||[]).forEach(w=>{if(!MOTS_VIDES.has(w))cnt[w]=(cnt[w]||0)+1});return (Object.entries(cnt).sort((a,b)=>b[1]-a[1]||b[0].length-a[0].length)[0]||[""])[0]}
function apprendre(regle){const pr=prof();pr.emetteurs=(pr.emetteurs||[]).filter(r=>normTxt(r.mot)!==normTxt(regle.mot));pr.emetteurs.unshift(regle);
  const mots=String(regle.mot).split(/[;,]/).map(x=>normTxt(x).trim()).filter(Boolean);let nb=0;
  mine().filter(f=>!locked(f)).forEach(f=>f.pieces.forEach(q=>{const T=normTxt(q.ocr||"");if(!T||!mots.every(m=>T.includes(m)))return;if(q.lu&&q.emetteur!==q.lu.emetteur&&q.emetteur!==regle.emetteur)return;
    if(q.emetteur===regle.emetteur&&(!regle.type||q.type===regle.type))return;q.emetteur=regle.emetteur;if(regle.type)q.type=regle.type;if(regle.sens)q.sens=regle.sens;q.resume=[TYPES[q.type],q.emetteur].filter(Boolean).join(" – ");nb++;touch(f)}));
  touch(null);return nb}
function normTxt(t){return String(t||"").toUpperCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[’']/g,"'")}
function parseText(raw,hintDoc){
  const T=normTxt(raw);const lines=T.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  // type
  let type="autre",best=0;for(const [k,list] of Object.entries(KW)){let sc=0;for(const w of list)if(T.includes(w))sc+=w.length>5?2:1;if(k==="convocation"&&hintDoc)sc+=1;if(sc>best){best=sc;type=k}}
  if(best<2&&!hintDoc)type=best?type:"autre";
  // dates
  const now=new Date(),minD=new Date(now.getFullYear()-2,0,1),maxD=new Date(now.getFullYear()+1,11,31);const dates=[];
  const push=(d,m,y,idx)=>{d=+d;m=+m;y=+y;if(y<100)y+=2000;if(y>maxD.getFullYear()&&String(y).endsWith("8")){const y2=y-2;if(y2<=maxD.getFullYear())y=y2}if(m<1||m>12||d<1||d>31)return;const dt=new Date(y,m-1,d);if(dt<minD||dt>maxD||dt.getDate()!==d)return;dates.push({s:`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`,idx})};
  let m;const rx1=/(\d{1,2})\s?[\/.\-]\s?(\d{1,2})\s?[\/.\-]\s?(\d{4}|\d{2})(?!\d)/g;while((m=rx1.exec(T)))push(m[1],m[2],m[3],m.index);
  const rx2=new RegExp("(\\d{1,2})(?:ER)?\\s+("+MOIS_RX+")\\s+(\\d{4})","g");while((m=rx2.exec(T)))push(m[1],MOIS_RX.split("|").indexOf(m[2])+1,m[3],m.index);
  const rx3=/(20\d{2})-(\d{2})-(\d{2})/g;while((m=rx3.exec(T)))push(m[3],m[2],m[1],m.index);
  dates.sort((a,b)=>a.idx-b.idx);
  let date="";if(dates.length){if(type==="convocation"){const pref=dates.find(d=>/(LE|REUNION|SEANCE|AURA LIEU|CONVOQUE)/.test(T.slice(Math.max(0,d.idx-60),d.idx)));date=(pref||dates[dates.length>1?1:0]).s}else date=dates[0].s}
  // heure
  let heure="";const rxH=/(?:^|[^\d\/.,])([01]?\d|2[0-3])\s?[:H]\s?([0-5]\d)(?![\d\/])/g;const hs=[];while((m=rxH.exec(T)))hs.push(m[1].padStart(2,"0")+":"+m[2]);
  if(hs.length)heure=hs[0];
  // montant
  let montant="",mconf=0;
  if(type!=="convocation"){
    const amt=s=>{const out=[];const r=/(\d{1,4})\s?[,.]\s?(\d{2})(?!\d)(?!\s?%)/g;let q;while((q=r.exec(s))){const v=parseFloat(q[1]+"."+q[2]);if(v>0&&v<2000)out.push(v)}return out};
    const exclu=l=>/T[VU]A|TYA|\bHT\b|RENDU|REMISE|MONNAIE|CAPITAL|POINTS|SOLDE/.test(l)&&!/TTC/.test(l.replace(/T[VU]A.*$/,""));
    const keyL=lines.filter(l=>/(TOTAL|TTC|MONTANT|A PAYER|NET|PAYE|REGLE|CB|CARTE|EUR|€|EUROS|PRIX|SOMME|DEBIT)/.test(l)&&!exclu(l));
    let c=[].concat(...keyL.map(amt));if(c.length)mconf=keyL.some(l=>/TTC|TOTAL/.test(l)&&amt(l).length)?2:1;else c=amt(lines.filter(l=>!exclu(l)).join("\n"));
    if(c.length)montant=Math.max(...c);
    // cohérence HT + TVA = TTC (péages : « Prix HT 10,08 · TVA 2,02 · TTC 12,10 »), ou TVA à 20 % × 6
    const un=l=>{const a=amt(l);return a.length===1?a[0]:null};
    const der=l=>{const a=amt(l);return a.length?a[a.length-1]:null};
    const htL=lines.find(l=>/\bHT\b/.test(l)&&!/TTC|T[VU]A/.test(l)&&un(l)!=null),tvaL=lines.find(l=>/T[VUY]A/.test(l)&&!/\bHT\b|TTC|TOTAUX/.test(l)&&der(l)!=null);
    const ht=htL?un(htL):null,tva=tvaL?der(tvaL):null;
    if(ht!=null&&tva!=null&&tva<ht){const t=r2(ht+tva);const near=c.find(v=>Math.abs(v-t)<.03);montant=near!=null?near:t;mconf=3}
    else if(tva!=null&&/\(?20[,.]0|20 ?%/.test(tvaL)){const t=r2(tva*6);const near=[].concat(c,amt(T)).filter(v=>Math.abs(v-t)<=Math.max(.06,t*.01));if(near.length){montant=near[0];mconf=3}else if(montant===""||montant<t*.6){montant=t;mconf=2}}
  }
  // émetteur : première ligne avec du texte
  const moi=typeof ME!=="undefined"&&ME?normTxt(ME.prenom||""):"";
  const brut=String(raw||"").split(/\n+/).map(s=>s.trim());
  const resto=brut.find(l=>/^\W*RESTAURANT\s+\S{3,}/i.test(l));
  let emetteur=resto?resto.replace(/^\W*RESTAURANT\s+/i,""):(brut.find(l=>{const u=normTxt(l);return /[A-ZÀ-ÿ]{3,}/i.test(l)&&!/^\W*\d/.test(u)&&!/^\W*(TICKET|DUPLICATA|CLIENT|BIENVENUE|MERCI|NOMBRE|DATE|COMMANDE|JUSTIFICATIF|DOCUMENT|NF525|SIRET|TEL|CB |CARTE|TOTAL|QTE|ARTICLE|PRODUIT|DESIGNATION|LE \d)/.test(u)&&!(moi&&u.includes(moi))&&(u.match(/[A-Z]/g)||[]).length>=u.replace(/\s/g,"").length*.6})||"");
  emetteur=emetteur.replace(/[^\wÀ-ÿ'&\- .]/g,"").replace(/\s{2,}/g," ").trim().slice(0,40);
  let sensR="";const R=regleEmetteur(T);if(R){emetteur=R.emetteur;if(R.type&&TYPES[R.type])type=R.type;sensR=R.sens||""}
  // motif (convocation)
  let motif="";
  if(type==="convocation"){const has=s=>T.includes(s);const acad=has("ACADEMIQUE")||has("RECTORAT"),dep=has("DEPARTEMENT")||has("DSDEN");
    if(has("F3SCT")&&has("ENQUETE"))motif="Enquête F3SCT";
    else if(has("F3SCT")&&has("GROUPE DE TRAVAIL"))motif=dep&&!acad?"Groupe de travail F3SCT-D":"Groupe de travail F3SCT-A";
    else if(has("F3SCT"))motif=dep&&!acad?"F3SCT-D":"F3SCT-A";
    else if(/\bCSA\b|COMITE SOCIAL/.test(T))motif=dep&&!acad?"CSA-D":"CSA-A";
    else if(has("CAPA"))motif="CAPA";
    else if(has("CONSEIL NATIONAL"))motif="Conseil national";
    else if(has("CONSEIL SYNDICAL"))motif="Conseil syndical académique";
    else if(has("BUREAU ACADEMIQUE"))motif="Bureau académique";
    else if(has("CONGRES"))motif="Congrès académique";
    else if(has("GROUPE DE TRAVAIL"))motif="Groupe de travail rectorat";
    else if(has("AUDIENCE"))motif=dep?"Audience DSDEN":acad?"Audience rectorat":"Audience établissement";
    if(motif&&!motifsList().includes(motif)){const near=motifsList().find(x=>normTxt(x)===normTxt(motif));if(near)motif=near}}
  const resume=[TYPES[type],emetteur].filter(Boolean).join(" – ");
  return{type,date,heure,montant,emetteur,resume,motif,sens:sensR,connu:!!R,mconf,ocr:T.slice(0,1500),found:!!(date||montant)};
}

/* ============ Détection des pièces sur une photo ============ */
function minAreaRect(pts){
  pts.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]);
  const lo=[],up=[];for(const p of pts){while(lo.length>1&&cr(lo[lo.length-2],lo[lo.length-1],p)<=0)lo.pop();lo.push(p)}
  for(let i=pts.length-1;i>=0;i--){const p=pts[i];while(up.length>1&&cr(up[up.length-2],up[up.length-1],p)<=0)up.pop();up.push(p)}
  const hull=lo.slice(0,-1).concat(up.slice(0,-1));let bestR=null,bestA=Infinity;
  for(let i=0;i<hull.length;i++){const a=hull[i],b=hull[(i+1)%hull.length];const len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<1e-6)continue;
    const ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len;let mnU=Infinity,mxU=-Infinity,mnV=Infinity,mxV=-Infinity;
    for(const p of hull){const u=p[0]*ux+p[1]*uy,v=-p[0]*uy+p[1]*ux;if(u<mnU)mnU=u;if(u>mxU)mxU=u;if(v<mnV)mnV=v;if(v>mxV)mxV=v}
    const A=(mxU-mnU)*(mxV-mnV);if(A<bestA){bestA=A;const P=(u,v)=>[u*ux-v*uy,u*uy+v*ux];bestR=[P(mnU,mnV),P(mxU,mnV),P(mxU,mxV),P(mnU,mxV)]}}
  if(!bestR)return null;if(cr(bestR[0],bestR[1],bestR[2])<0)bestR.reverse();
  // départ : coin le plus en haut à gauche
  let s=0,bv=Infinity;bestR.forEach((p,i)=>{const v=p[0]+p[1];if(v<bv){bv=v;s=i}});
  return{rect:[0,1,2,3].map(i=>bestR[(i+s)%4]),area:bestA};
}
function detectPieces(src){
  const sm=scaled(src,900),W=sm.width,H=sm.height,N=W*H;const d=sm.getContext("2d",{willReadFrequently:true}).getImageData(0,0,W,H).data;
  // couleur du fond = médiane des bords
  const br=[],bgc=[],bb=[];const addB=i=>{br.push(d[i*4]);bgc.push(d[i*4+1]);bb.push(d[i*4+2])};
  for(let x=0;x<W;x+=2){addB(x);addB((H-1)*W+x)}for(let y=0;y<H;y+=2){addB(y*W);addB(y*W+W-1)}
  const med=a=>{a.sort((p,q)=>p-q);return a[a.length>>1]};const R=med(br),G=med(bgc),B=med(bb);const bgL=R*.3+G*.59+B*.11;
  const dist=new Uint8Array(N);const hist=new Uint32Array(256);
  for(let i=0;i<N;i++){const k=i*4;let v=(Math.abs(d[k]-R)+Math.abs(d[k+1]-G)+Math.abs(d[k+2]-B))/1.5;v=v>255?255:v|0;dist[i]=v;hist[v]++}
  let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];let sB=0,wB=0,bestV=0,thr=40;
  for(let t=0;t<256;t++){wB+=hist[t];if(!wB)continue;const wF=N-wB;if(!wF)break;sB+=t*hist[t];const mB=sB/wB,mF=(sum-sB)/wF;const v=wB*wF*(mB-mF)*(mB-mF);if(v>bestV){bestV=v;thr=t}}
  thr=Math.max(thr,22);
  let mask=new Uint8Array(N);let on=0;for(let i=0;i<N;i++)if(dist[i]>thr){mask[i]=1;on++}
  if(on>N*.92||on<N*.01)return[];
  // fermeture morphologique (bouche les trous du texte, relie le contenu d'un même papier)
  const rad=Math.max(2,Math.round(Math.min(W,H)*(bgL>170?.022:.008)));
  const box=(m,r,val)=>{const I=new Uint32Array((W+1)*(H+1));for(let y=0;y<H;y++){let rs=0;for(let x=0;x<W;x++){rs+=m[y*W+x];I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+rs}}
    const o=new Uint8Array(N);for(let y=0;y<H;y++){const y0=Math.max(0,y-r),y1=Math.min(H-1,y+r);for(let x=0;x<W;x++){const x0=Math.max(0,x-r),x1=Math.min(W-1,x+r);const s=I[(y1+1)*(W+1)+x1+1]-I[y0*(W+1)+x1+1]-I[(y1+1)*(W+1)+x0]+I[y0*(W+1)+x0];const full=(y1-y0+1)*(x1-x0+1);o[y*W+x]=val==="dil"?(s>0?1:0):(s===full?1:0)}}return o};
  mask=box(box(mask,rad,"dil"),rad,"ero");
  // composantes connexes
  const lab=new Int32Array(N);let nl=0;const comps=[];
  for(let i=0;i<N;i++){if(!mask[i]||lab[i])continue;nl++;const st2=[i];lab[i]=nl;let cnt=0;const mnX=new Int32Array(H).fill(1e9),mxX=new Int32Array(H).fill(-1);let y0=H,y1=0,edge=0;
    while(st2.length){const j=st2.pop();const x=j%W,y=(j/W)|0;cnt++;if(x<mnX[y])mnX[y]=x;if(x>mxX[y])mxX[y]=x;if(y<y0)y0=y;if(y>y1)y1=y;if(x===0||y===0||x===W-1||y===H-1)edge++;
      if(x>0&&mask[j-1]&&!lab[j-1]){lab[j-1]=nl;st2.push(j-1)}if(x<W-1&&mask[j+1]&&!lab[j+1]){lab[j+1]=nl;st2.push(j+1)}
      if(y>0&&mask[j-W]&&!lab[j-W]){lab[j-W]=nl;st2.push(j-W)}if(y<H-1&&mask[j+W]&&!lab[j+W]){lab[j+W]=nl;st2.push(j+W)}}
    if(cnt<N*.006)continue;
    const pts=[];for(let y=y0;y<=y1;y++)if(mxX[y]>=0)pts.push([mnX[y],y],[mxX[y]+1,y],[mnX[y],y+1],[mxX[y]+1,y+1]);
    const mr=minAreaRect(pts);if(!mr)continue;if(cnt/mr.area<.45)continue;if(mr.area>N*.97)continue;
    comps.push({rect:mr.rect,area:mr.area,cx:mr.rect.reduce((a,p)=>a+p[0],0)/4,cy:mr.rect.reduce((a,p)=>a+p[1],0)/4})}
  // ignorer les petits morceaux à côté d'une grande pièce (taches, ombres)
  const big=Math.max(0,...comps.map(c=>c.area));const keep=comps.filter(c=>c.area>big*.08);
  keep.sort((a,b)=>Math.abs(a.cy-b.cy)>H*.15?a.cy-b.cy:a.cx-b.cx);
  return keep.map(c=>{const mx=c.cx,my=c.cy;return c.rect.map(([x,y])=>[Math.min(1,Math.max(0,(mx+(x-mx)*1.015)/W)),Math.min(1,Math.max(0,(my+(y-my)*1.015)/H))])});
}
/* tickets blancs sur fond blanc (scanner) : on regroupe les blocs de texte, plus serrés en largeur qu'en hauteur */
function textClusters(src){
  const sm=scaled(src,900),W=sm.width,H=sm.height,N=W*H;const d=sm.getContext("2d",{willReadFrequently:true}).getImageData(0,0,W,H).data;
  const L=new Uint8Array(N);const br=[];for(let i=0;i<N;i++){const k=i*4;L[i]=(d[k]*.3+d[k+1]*.59+d[k+2]*.11)|0}
  for(let x=0;x<W;x+=3){br.push(L[x],L[(H-1)*W+x])}for(let y=0;y<H;y+=3){br.push(L[y*W],L[y*W+W-1])}br.sort((a,b)=>a-b);const bg=br[br.length>>1];
  if(bg<200)return[];
  const dark=new Uint8Array(N);let nd=0;for(let i=0;i<N;i++)if(L[i]<bg-60){dark[i]=1;nd++}
  if(nd<N*.01||nd>N*.4)return[];
  const M=Math.max(W,H),rx=Math.max(3,Math.round(M*.0067)),ry=Math.max(6,Math.round(M*.0156));
  const I=new Uint32Array((W+1)*(H+1));for(let y=0;y<H;y++){let rs=0;for(let x=0;x<W;x++){rs+=dark[y*W+x];I[(y+1)*(W+1)+x+1]=I[y*(W+1)+x+1]+rs}}
  const m=new Uint8Array(N);for(let y=0;y<H;y++){const y0=Math.max(0,y-ry),y1=Math.min(H-1,y+ry);for(let x=0;x<W;x++){const x0=Math.max(0,x-rx),x1=Math.min(W-1,x+rx);
    if(I[(y1+1)*(W+1)+x1+1]-I[y0*(W+1)+x1+1]-I[(y1+1)*(W+1)+x0]+I[y0*(W+1)+x0])m[y*W+x]=1}}
  const lab=new Int32Array(N);let nl=0;const boxes=[];
  for(let i=0;i<N;i++){if(!m[i]||lab[i])continue;nl++;lab[i]=nl;const stk=[i];let x0=W,y0=H,x1=0,y1=0;
    while(stk.length){const j=stk.pop(),x=j%W,y=(j/W)|0;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;
      if(x>0&&m[j-1]&&!lab[j-1]){lab[j-1]=nl;stk.push(j-1)}if(x<W-1&&m[j+1]&&!lab[j+1]){lab[j+1]=nl;stk.push(j+1)}if(y>0&&m[j-W]&&!lab[j-W]){lab[j-W]=nl;stk.push(j-W)}if(y<H-1&&m[j+W]&&!lab[j+W]){lab[j+W]=nl;stk.push(j+W)}}
    const bw=x1-x0,bh=y1-y0;if(bw*bh>N*.02&&bw>W*.08&&bh>H*.08)boxes.push([x0,y0,x1,y1])}
  if(boxes.length<2)return[];
  boxes.sort((a,b)=>Math.abs(a[1]-b[1])>H*.1?a[1]-b[1]:a[0]-b[0]);
  const px=W*.012,py=H*.012,c=v=>Math.min(1,Math.max(0,v));
  return boxes.map(([x0,y0,x1,y1])=>[[c((x0-px)/W),c((y0-py)/H)],[c((x1+px)/W),c((y0-py)/H)],[c((x1+px)/W),c((y1+py)/H)],[c((x0-px)/W),c((y1+py)/H)]]);
}
const okDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)?s:"";
const okTime=s=>{if(typeof s!=="string")return "";const m=s.match(/^(\d{1,2})[:hH](\d{2})/);return m?m[1].padStart(2,"0")+":"+m[2]:""};

/* ============ Ingestion ============ */
/* ============ Transfert par QR code animé (code fontaine LT) ============ */
const B45="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
function b45enc(u8){let s="";for(let i=0;i<u8.length;i+=2){if(i+1<u8.length){let x=u8[i]*256+u8[i+1];const c=x%45;x=(x-c)/45;const d=x%45;s+=B45[c]+B45[d]+B45[(x-d)/45]}else{const x=u8[i],c=x%45;s+=B45[c]+B45[(x-c)/45]}}return s}
function b45dec(s){const out=new Uint8Array(Math.floor(s.length/3)*2+(s.length%3?1:0));let o=0;for(let i=0;i<s.length;i+=3){const c=B45.indexOf(s[i]),d=B45.indexOf(s[i+1]);if(c<0||d<0)throw new Error("b45");if(i+2<s.length){const e=B45.indexOf(s[i+2]);if(e<0)throw new Error("b45");const x=c+d*45+e*2025;if(x>65535)throw new Error("b45");out[o++]=x>>8;out[o++]=x&255}else{const x=c+d*45;if(x>255)throw new Error("b45");out[o++]=x}}return out.subarray(0,o)}
const CRC_T=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
function crc32(u8){let c=0xFFFFFFFF;for(let i=0;i<u8.length;i++)c=CRC_T[(c^u8[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0}
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function solitonCDF(K){
  if(K<3)return[0,1];
  const c=0.05,delta=0.5;const R=Math.max(1,c*Math.log(K/delta)*Math.sqrt(K));
  const p=new Float64Array(K+1);p[1]=1/K;for(let d=2;d<=K;d++)p[d]=1/(d*(d-1));
  const lim=Math.max(1,Math.min(K,Math.floor(K/R)));for(let d=1;d<lim;d++)p[d]+=R/(d*K);p[lim]+=Math.max(0,R*Math.log(R/delta)/K);
  let s=0;for(let d=1;d<=K;d++)s+=p[d];const cdf=new Float64Array(K+1);let a=0;for(let d=1;d<=K;d++){a+=p[d]/s;cdf[d]=a}return cdf;
}
function frameBlocks(seed,K,cdf){
  if(seed<K)return[seed];
  const rnd=mulberry32((Math.imul(seed,2654435761)^K)>>>0);const u=rnd();let d=1;while(d<K&&d<cdf.length-1&&cdf[d]<u)d++;d=Math.min(d,K);
  const set=new Set();while(set.size<d)set.add(Math.floor(rnd()*K));return[...set];
}
function xorInto(a,b){for(let i=0;i<a.length;i++)a[i]^=b[i]}
const HDR=21;// ver1 tid4 K4 L4 crc4 seed4
function makeSender(data,B){
  const L=data.length,K=Math.max(1,Math.ceil(L/B));const blocks=[];for(let i=0;i<K;i++){const b=new Uint8Array(B);b.set(data.subarray(i*B,Math.min(L,(i+1)*B)));blocks.push(b)}
  const cdf=solitonCDF(K);const tid=(Math.random()*4294967296)>>>0;const crc=crc32(data);let seed=0;
  return{K,L,B,next(){const s=seed++;const idx=frameBlocks(s,K,cdf);const buf=new Uint8Array(HDR+B);const dv=new DataView(buf.buffer);
    dv.setUint8(0,1);dv.setUint32(1,tid);dv.setUint32(5,K);dv.setUint32(9,L);dv.setUint32(13,crc);dv.setUint32(17,s);
    const pay=buf.subarray(HDR);for(const i of idx)xorInto(pay,blocks[i]);return "FS1:"+b45enc(buf)}};
}
function makeReceiver(){
  let st0=null;const r={done:false,got:0,frames:0,K:0,
    add(text){
      if(typeof text!=="string"||!text.startsWith("FS1:"))return false;let buf;try{buf=b45dec(text.slice(4))}catch(_){return false}
      if(buf.length<HDR+1||buf[0]!==1)return false;const dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength);
      const tid=dv.getUint32(1),K=dv.getUint32(5),L=dv.getUint32(9),crc=dv.getUint32(13),seed=dv.getUint32(17);const B=buf.length-HDR;
      if(!st0||st0.tid!==tid){if(K>200000||B*K<L)return false;st0={tid,K,L,crc,B,cdf:solitonCDF(K),blocks:new Array(K),pending:[],seen:new Set()};r.got=0;r.K=K;r.done=false;r.frames=0}
      if(st0.seen.has(seed))return true;st0.seen.add(seed);r.frames++;
      const pay=buf.slice(HDR);let idx=frameBlocks(seed,K,st0.cdf).filter(i=>{if(st0.blocks[i]){xorInto(pay,st0.blocks[i]);return false}return true});
      if(!idx.length)return true;
      if(idx.length>1){st0.pending.push({idx:new Set(idx),buf:pay});return true}
      const q=[[idx[0],pay]];
      while(q.length){const [j,b]=q.pop();if(st0.blocks[j])continue;st0.blocks[j]=b;r.got++;
        for(const p of st0.pending){if(p.idx.has(j)){xorInto(p.buf,b);p.idx.delete(j);if(p.idx.size===1){const k=p.idx.values().next().value;p.idx.delete(k);q.push([k,p.buf])}}}
        st0.pending=st0.pending.filter(p=>p.idx.size>0)}
      if(r.got===K){const out=new Uint8Array(K*B);st0.blocks.forEach((b,i)=>out.set(b,i*B));const data=out.subarray(0,L);
        if(crc32(data)!==st0.crc){st0=null;r.got=0;return false}r.done=true;r.data=data}
      return true},
    progress(){return st0?r.got/st0.K:0}};
  return r;
}
/* paquet : 'FSB1' + drapeau + longueur JSON + JSON (éventuellement gzip) + images JPEG */
async function gz(u8,mode){if(typeof CompressionStream==="undefined")return null;const s=new Blob([u8]).stream().pipeThrough(mode==="c"?new CompressionStream("gzip"):new DecompressionStream("gzip"));return new Uint8Array(await new Response(s).arrayBuffer())}
async function shrinkImage(id,max){const blob=await Store.blob(id);const c=await fileToCanvas(blob,max);return new Uint8Array(await (await toBlob(c,"image/jpeg",.62)).arrayBuffer())}
function drawQR(canvas,text){
  const qr=window.qrcode(0,"L");qr.addData(text,"Alphanumeric");qr.make();const n=qr.getModuleCount();const q=4;const tot=n+2*q;
  const px=Math.max(2,Math.floor(Math.min(canvas.clientWidth||600,900)*(window.devicePixelRatio||1)/tot));canvas.width=canvas.height=px*tot;
  const x=canvas.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,canvas.width,canvas.height);x.fillStyle="#000";
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))x.fillRect((c+q)*px,(r+q)*px,px,px);return n;
}
window.__fsQR={makeSender,makeReceiver,buildBundle,unpackBundle,drawQR,b45enc,b45dec};

let qx=null;// état du transfert en cours
function qrStop(){if(!qx)return;clearInterval(qx.timer);if(qx.raf)cancelAnimationFrame(qx.raf);clearTimeout(qx.scanT);if(qx.stream)qx.stream.getTracks().forEach(t=>t.stop());if(qx.wake)try{qx.wake.release()}catch(_){}qx=null}

/* ============ Rendu ============ */
function tabsList(){const t=[["deps","Déplacements"],["pieces","Justificatifs"],["recap","Récapitulatif"],["reg","Réglages"]];if(can("frais.valider"))t.push(["tous","Déclarations"]);if(can("frais.regler"))t.push(["commun","Barème"]);return t}
const locked=f=>f&&["envoyee","validee","payee"].includes(f.statut);
function statutChip(f){const s=STATUTS[f.statut]||STATUTS.brouillon;return `<span class="chip ${s[1]}">${s[0]}${f.statut==="envoyee"&&f.envoyeLe?" le "+fdate(f.envoyeLe):f.statut==="payee"&&f.payeeLe?" le "+fdate(f.payeeLe):""}</span>`}
function page(){
  Store.init();try{st.cutMode=localStorage.getItem("fs-cut")||"auto"}catch(_){}
  migrer();conf();prof();
  if(!st.cur||!cur()){let saved=null;try{saved=localStorage.getItem("fs-cur")}catch(_){}
    const l=mine().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));st.cur=(l.find(f=>f.id===saved)||l.find(f=>f.statut==="brouillon")||l[0]||{}).id||null}
  if(!tabsList().some(t=>t[0]===st.tab))st.tab="deps";
  modals();
  $("#main").innerHTML=`<div class="fr" id="frRoot">
    <div class="fr-top"><div class="fr-brand"><h1>Frais de déplacement</h1><div class="small mut" id="frWho"></div><a class="small" href="docs/Mode_emploi_frais_convocations.pdf" target="_blank" rel="noopener">📘 Mode d'emploi (PDF)</a></div>
      <div class="fr-pick"><select id="ficheSel" aria-label="Fiche de frais"></select><button class="btn sm" data-act="newFiche" title="Nouvelle fiche">+ Fiche</button><button class="btn sm sec" data-qr="open" title="Passer les photos des justificatifs d'un appareil à l'autre">⇄ Photos</button></div></div>
    <nav class="fr-tabs" id="frTabs"></nav>
    <div id="frView" aria-live="polite"></div>
    <input type="file" id="fileIn" accept="image/*,application/pdf" multiple hidden>
    <input type="file" id="camIn" accept="image/*" capture="environment" hidden>
    <input type="file" id="restoreIn" accept=".json,application/json" hidden>
    <datalist id="frEtabs">${D.etablissements.filter(e=>!e.service).map(e=>`<option value="${esc(e.nom+" — "+(e.ville||"")+" · "+e.uai)}">`).join("")}</datalist>
  </div>`;
  renderView();
}
function renderFichePick(){
  const l=mine().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $("#ficheSel").innerHTML=l.map(f=>`<option value="${f.id}" ${f.id===st.cur?"selected":""}>${esc(f.titre||"Sans titre")}${f.statut!=="brouillon"?" · "+STATUTS[f.statut][0].toLowerCase():""}</option>`).join("")+`<option value="__manage">Gérer mes fiches…</option>`;
  const i=ident();$("#frWho").textContent=[i.prenom,i.nom].filter(Boolean).join(" ")+" · "+i.fonction;
}
function renderTabs(){
  const f=cur();const un=f?f.pieces.filter(p=>!isAssigned(p,f)).length:0;const nt=can("frais.valider")?all().filter(x=>x.statut==="envoyee"&&x.userId!==ME.id).length:0;
  $("#frTabs").innerHTML=tabsList().map(([k,l])=>`<button data-tab="${k}" ${st.tab===k?'aria-current="page"':""}>${ICON[k]}<span>${l}</span>${k==="pieces"&&un?`<span class="badge">${un}</span>`:""}${k==="tous"&&nt?`<span class="badge">${nt}</span>`:""}</button>`).join("");
}
function renderView(){
  const v=$("#frView");if(!v)return;
  renderFichePick();renderTabs();
  if(!cur()&&!["reg","tous","commun"].includes(st.tab)){v.innerHTML=`${rappelHtml()}<div class="fr-empty"><b>Aucune fiche</b>Crée une fiche : elle regroupe tous tes déplacements et dépenses depuis ta dernière fiche, puis tu l'envoies quand tout est justifié.<div style="margin-top:12px"><button class="btn" data-act="newFiche">Créer une fiche</button></div></div>`;return}
  v.innerHTML=st.tab==="deps"?viewDeps():st.tab==="pieces"?viewPieces():st.tab==="recap"?viewRecap():st.tab==="tous"?viewTous():st.tab==="commun"?viewCommun():viewReg();
  if(st.tab==="reg")initSigPad();
  if(st.tab==="deps"){const f=cur();f&&f.deps.forEach(d=>{if(d.mode!=="hab"&&(d.legs||[]).some(l=>l.km==null&&!l.err))autoCalc(f,d)})}
}
const render=renderView;
function selOpts(list,val,placeholder){return (placeholder!=null?`<option value="">${esc(placeholder)}</option>`:"")+list.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<option value="${esc(v)}" ${String(v)===String(val)?"selected":""}>${esc(l)}</option>`}).join("")}
function moneyIn(bind,val,label){return `<label class="f"><span>${label}</span><div class="money"><input type="number" inputmode="decimal" step="0.01" min="0" data-bind="${bind}" value="${n(val)||""}" placeholder="0,00"></div></label>`}
function summaryBar(f,c){return `<div class="fr-summary">
  <div><div class="eyebrow">Kilomètres</div><div class="v">${kmTxt(c.km)}</div><div class="small mut num">${eur(c.ik)}</div></div>
  <div><div class="eyebrow">Péages + parking</div><div class="v">${eur(c.peages+c.parking)}</div></div>
  <div><div class="eyebrow">Repas + autres</div><div class="v">${eur(c.repas+c.autres)}</div></div>
  <div class="big"><div class="eyebrow">Remboursement total</div><div class="v" data-total="fiche">${eur(c.total)}</div></div></div>`}

/* ---------- Rappel : réunions passées sans frais déclarés ---------- */
function reunionsSansFrais(){
  if(!Array.isArray(D.reunions))return[];const pr=prof(),ign=pr.ignoreReu||[];const lim=new Date(Date.now()-120*864e5).toISOString().slice(0,10);
  const declares=new Set();mine().forEach(f=>f.deps.forEach(d=>d.reunionId&&declares.add(d.reunionId)));
  return D.reunions.filter(r=>r.date&&r.date<today()&&r.date>=lim&&!declares.has(r.id)&&!ign.includes(r.id)&&(r.participants||[]).some(x=>(x.pid&&x.pid===ME.pid||x.uid===ME.id)&&/présent/i.test(x.statut||"")));
}
function rappelHtml(){const l=reunionsSansFrais();if(!l.length)return "";
  return `<div class="fr-notice"><b>${l.length>1?l.length+" réunions":"Une réunion"} sans frais déclarés</b> : tu y étais présent(e).${l.map(r=>`<div class="row" style="margin-top:6px"><span>${fdate(r.date)} · ${esc(r.titre||r.type||"Réunion")}${r.lieu?" · "+esc(String(r.lieu).split("\n")[0]):""}</span><button class="btn sm" data-act="depReu" data-id="${r.id}">Déclarer mes frais</button><button class="btn sm ghost" data-act="ignReu" data-id="${r.id}">Pas de frais</button></div>`).join("")}</div>`}

/* ---------- Points de départ / destination ---------- */
function ptVal(p){if(!p)return "";const pr=prof();if(p.k==="dom")return "dom";if(p.k==="etab"&&p.ref===pr.uai)return "monetab";if(p.k==="lieu")return "lieu:"+p.ref;if(p.k==="etab")return "etab:"+p.ref;if(p.k==="adr")return "adr";return ""}
function ptSelect(d,idx,p,placeholder){
  const pr=prof(),v=ptVal(p),me=pr.uai&&etabDe(pr.uai),serv=D.etablissements.filter(e=>e.service);
  const autreEtab=p&&p.k==="etab"&&p.ref!==pr.uai&&!serv.some(e=>e.uai===p.ref);
  return `<select data-pt="${d.id}|${idx}"><option value="">${esc(placeholder||"Choisir…")}</option>
    <option value="dom" ${v==="dom"?"selected":""}>Domicile${pr.adresse?"":" (adresse à renseigner)"}</option>
    <option value="monetab" ${v==="monetab"?"selected":""} ${me?"":"disabled"}>Mon établissement${me?" — "+esc(me.nom):" (à choisir dans Réglages)"}</option>
    ${lieux().length?`<optgroup label="Lieux de réunion">${lieux().map(l=>`<option value="lieu:${esc(l.id)}" ${v==="lieu:"+l.id?"selected":""}>${esc(l.nom+(l.ville?" ("+l.ville+")":""))}</option>`).join("")}</optgroup>`:""}
    ${serv.length?`<optgroup label="Rectorat et DSDEN">${serv.map(e=>`<option value="etab:${esc(e.uai)}" ${v==="etab:"+e.uai?"selected":""}>${esc(e.nom)}</option>`).join("")}</optgroup>`:""}
    ${autreEtab?`<option value="etab:${esc(p.ref)}" selected>${esc(ptLabel(p))}</option>`:""}
    <option value="autreEtab">Autre établissement…</option><option value="adr" ${v==="adr"?"selected":""}>Autre adresse…</option></select>
    ${p&&p.k==="adr"?`<input type="text" data-ptadr="${d.id}|${idx}" value="${esc(p.adr||"")}" placeholder="N°, rue, code postal, ville" style="margin-top:6px">`:""}
    ${p&&p._choix?`<input list="frEtabs" data-ptetab="${d.id}|${idx}" placeholder="Tape le nom ou la ville de l'établissement" style="margin-top:6px">`:""}`;
}
function legsHtml(f,d){
  const legs=d.legs||[];if(!legs.length)return `<div class="small mut c12">Choisis le départ et la destination : les kilomètres de chaque étape s'affichent ici.</div>`;
  return `<div class="c12 fr-legs">${legs.map((l,i)=>`<div class="fr-leg"><span class="fr-leg-t">${esc(l.la)} → ${esc(l.lb)}</span>
    <span class="fr-leg-km"><input type="number" inputmode="decimal" min="0" step="0.1" data-leg="${d.id}|${i}" value="${l.km==null?"":n(l.km)}" placeholder="km"> km</span>
    <span class="small mut fr-leg-src">${l.km==null?(l.err?"⚠ "+esc(l.err):navigator.onLine?"calcul en cours…":"hors ligne : saisis les km"):esc(l.src||"")}</span>
    <button class="btn sm ghost" data-act="calcLeg" data-id="${d.id}" data-i="${i}" title="Recalculer avec l'itinéraire IGN (internet)">↻</button></div>`).join("")}</div>`;
}
function trajetHtml(f,d){
  const pr=prof(),c=depCalc(d,f);
  if(d.mode==="hab"){const trajOpts=[...pr.trajets.map(t=>[t.label,`${t.label} (${t.km} km)`]),["Autre","Autre (saisir les km)"]];
    return `<label class="f c8"><span>Trajet aller</span><select data-bind="dep.${d.id}.aller" data-traj="allerKm" data-rerender>${selOpts(trajOpts,d.aller,"Choisir…")}</select></label>
      <label class="f c4"><span>Km aller</span><input type="number" inputmode="decimal" min="0" data-bind="dep.${d.id}.allerKm" value="${n(d.allerKm)||""}" placeholder="0"></label>
      <label class="f c8"><span>Trajet retour</span><select data-bind="dep.${d.id}.retourHab" data-traj="retourKm" data-rerender>${selOpts(trajOpts,d.retourHab,"Choisir…")}</select></label>
      <label class="f c4"><span>Km retour</span><input type="number" inputmode="decimal" min="0" data-bind="dep.${d.id}.retourKm" value="${n(d.retourKm)||""}" placeholder="0"></label>`}
  const pts=d.pts||[];
  return `<div class="f c6"><span class="fr-lab">Départ</span>${ptSelect(d,0,pts[0],"Choisir le départ…")}</div>
    ${pts.slice(1).map((p,i)=>`<div class="f c6"><span class="fr-lab">${pts.length>2?"Étape "+(i+1):"Destination"} ${i>0||pts.length>2?`<button class="btn sm ghost" data-act="delPt" data-id="${d.id}" data-i="${i+1}" title="Retirer cette étape">✕</button>`:""}</span>${ptSelect(d,i+1,p,"Choisir la destination…")}</div>`).join("")}
    ${pts.length<2?`<div class="f c6"><span class="fr-lab">Destination</span>${ptSelect(d,Math.max(1,pts.length),null,"Choisir la destination…")}</div>`:d._addPt?`<div class="f c6"><span class="fr-lab">Nouvelle étape</span>${ptSelect(d,pts.length,null,"Choisir l'étape suivante…")}</div>`:""}
    <div class="f c6"><span class="fr-lab">Retour vers</span><select data-ret="${d.id}"><option value="">Le point de départ</option><option value="autre" ${d.retour?"selected":""}>Un autre point…</option></select>${d.retour?`<div style="margin-top:6px">${ptSelect(d,"ret",d.retour,"Choisir le point de retour…")}</div>`:""}</div>
    <div class="c6 row" style="align-items:flex-end">${pts.length>=2?`<button class="btn sm sec" data-act="addPt" data-id="${d.id}">+ Ajouter une étape</button>`:""}</div>
    ${legsHtml(f,d)}`;
}
function repasHtml(f,d){
  const b=bareme(d.date),{ref}=pieceOrder(f);
  return `<div class="c12 fr-repas"><div class="row" style="justify-content:space-between"><span class="small"><b>Repas</b> <span class="mut">· remboursé au réel, ${eur(b.repasMax)} maximum par repas, sur justificatif</span></span><button class="btn sm ghost" data-act="addRepas" data-id="${d.id}">+ Repas</button></div>
    ${(d.repas||[]).map(m=>{const ok=repasOk(m,f),r=ok?Math.min(n(m.montant),b.repasMax):0;const pc=m.pieceId&&f.pieces.find(p=>p.id===m.pieceId);
      return `<div class="fr-repas-l"><span class="num">${pc?`<b class="ref">${ref[pc.id]}</b> ticket`:"saisi"}</span>
      <div class="money" style="width:110px"><input type="number" inputmode="decimal" step="0.01" min="0" data-repas="${d.id}|${m.id}" value="${n(m.montant)||""}" placeholder="0,00" ${pc?"disabled":""}></div>
      ${pc?"":`<label class="small" style="display:flex;gap:4px;align-items:center"><input type="checkbox" data-repaspap="${d.id}|${m.id}" ${m.papier?"checked":""}> ticket remis en papier</label>`}
      <span class="num small ${ok?"":"fr-bad"}">→ ${ok?eur(r):"0 € : ticket manquant"}</span>${pc?"":`<button class="btn sm ghost" data-act="delRepas" data-id="${d.id}" data-i="${m.id}">✕</button>`}</div>`}).join("")||`<div class="small mut">Aucun repas. Un ticket de restaurant numérisé s'ajoute ici tout seul.</div>`}</div>`;
}
function viewDeps(){
  const f=cur(),c=ficheCalc(f),deps=sortedDeps(f),lk=locked(f);
  const cards=deps.map((d,i)=>{
    const dc=depCalc(d,f);const ps=f.pieces.filter(x=>x.depId===d.id);const ref=pieceOrder(f).ref;
    if(d.mode!=="hab")rebuildLegs(d);
    return `<article class="card fr-dep" data-dep="${d.id}">
      <div class="dep-head"><span class="dep-no">D${i+1}</span><div class="dep-title">${esc(motifTxt(d)||"Nouveau déplacement")}<div class="small mut">${d.date?fdate(d.date):"Date à préciser"}${d.reunionId?" · réunion":""}</div></div>
      ${ps.length?`<span class="chip ok">${ps.length} justificatif${ps.length>1?"s":""}</span>`:`<span class="chip warn">sans justificatif</span>`}
      <span class="dep-total" data-total="${d.id}">${eur(dc.total)}</span></div>
      <div class="fr-grid">
        <label class="f c3"><span>Date</span><input type="date" data-bind="dep.${d.id}.date" value="${esc(d.date)}"></label>
        <label class="f ${d.motif==="Autre"?"c4":"c9"}"><span>Motif</span><select data-bind="dep.${d.id}.motif" data-rerender>${selOpts(motifsList(),d.motif,"Choisir le motif…")}</select></label>
        ${d.motif==="Autre"?`<label class="f c5"><span>Préciser le motif</span><input type="text" data-bind="dep.${d.id}.motifAutre" value="${esc(d.motifAutre)}"></label>`:""}
        <div class="c12 row"><div class="pill-select"><button type="button" class="${d.mode!=="hab"?"on":""}" data-act="mode" data-id="${d.id}" data-v="points">Départ et destination</button><button type="button" class="${d.mode==="hab"?"on":""}" data-act="mode" data-id="${d.id}" data-v="hab">Trajet habituel</button></div></div>
        ${trajetHtml(f,d)}
        <div class="c12 row"><label class="small" style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-bind="dep.${d.id}.passager" ${d.passager?"checked":""} data-rerender> Covoiturage : j'étais passager (pas de km pour moi)</label>${d.passager?`<input type="text" data-bind="dep.${d.id}.conducteur" value="${esc(d.conducteur)}" placeholder="Nom du conducteur" style="max-width:240px">`:""}</div>
        <div class="c12 kmline num"><span>${d.passager?`${kmTxt(dc.kmBrut)} parcourus · passager : 0 km`:`${kmTxt(dc.km)} × ${dc.b.km.toFixed(2).replace(".",",")} €`}</span><b data-total="ik-${d.id}">${eur(dc.ik)}</b></div>
        <div class="c3">${moneyIn(`dep.${d.id}.peageA`,d.peageA,"Péage aller")}</div>
        <div class="c3">${moneyIn(`dep.${d.id}.peageR`,d.peageR,"Péage retour")}</div>
        <div class="c3">${moneyIn(`dep.${d.id}.parkA`,d.parkA,"Parking aller")}</div>
        <div class="c3">${moneyIn(`dep.${d.id}.parkR`,d.parkR,"Parking retour")}</div>
        ${repasHtml(f,d)}
        <div class="c12"><label class="small mut" style="display:flex;gap:6px;align-items:center;cursor:pointer"><input type="checkbox" data-bind="dep.${d.id}.auto" ${d.auto?"checked":""} data-rerender> Reprendre les montants des justificatifs (péages, parking, repas)</label></div>
      </div>
      <div><div class="eyebrow" style="margin-bottom:6px">Justificatifs (convocation, tickets)</div>
        <div class="thumbs">${ps.map(x=>`<button class="thumb" data-act="editPiece" data-id="${x.id}" title="${esc(TYPES[x.type]||"")}">${imgTag(x.imgId,TYPES[x.type])}<span><b class="ref">${ref[x.id]}</b> ${esc(TYPES[x.type]||"")}</span></button>`).join("")}
        <button class="addthumb" data-act="addFor" data-id="${d.id}">${ICON.up}Ajouter</button><button class="addthumb" data-act="camFor" data-id="${d.id}">${ICON.cam}Photo</button></div></div>
      <div class="row" style="justify-content:flex-end"><button class="btn sm ghost" data-act="dupDep" data-id="${d.id}">Dupliquer</button><button class="btn sm ghost danger" data-act="askDelDep" data-id="${d.id}">Supprimer</button></div>
      <div data-confirm="${d.id}"></div>
    </article>`}).join("");
  const ps=f.pieces.filter(x=>x.depId==="autres");const ref=pieceOrder(f).ref;
  return `${rappelHtml()}${f.statut==="corriger"?`<div class="fr-notice"><b>À corriger</b> (trésorerie) : ${esc(f.commentaire||"voir avec la trésorière")}</div>`:""}
  ${lk?`<div class="fr-notice info">Fiche ${STATUTS[f.statut][0].toLowerCase()} : elle n'est plus modifiable.${f.statut==="envoyee"?` <button class="btn sm" data-act="unsend">Repasser en brouillon</button>`:""}</div>`:""}
  ${summaryBar(f,c)}
  <fieldset class="fr-fs" ${lk?"disabled":""}>
  <div class="section-head"><div><div class="eyebrow">${esc(f.titre)}${periode(f)?" · "+esc(periode(f)):""}</div><h2>Déplacements</h2></div><button class="btn" data-act="addDep">+ Ajouter un déplacement</button></div>
  <div class="stack">${cards||`<div class="fr-empty"><b>Aucun déplacement pour l'instant</b>Ajoute un déplacement, déclare une réunion, ou numérise tes justificatifs : les déplacements sont créés d'après leurs dates.</div>`}</div>
  <div class="section-head" style="margin-top:26px"><h2>Autres frais</h2><span class="dep-total num" data-total="autres">${eur(c.autres)}</span></div>
  <article class="card fr-dep"><div class="fr-grid">
    <div class="c4">${moneyIn("aut.postal",f.autres.postal,"Frais d'envois postaux")}</div>
    <div class="c4">${moneyIn("aut.internet",f.autres.internet,"Internet / téléphonie")}</div>
    <div class="c4">${moneyIn("aut.divers",f.autres.divers,"Divers")}</div>
    <label class="f c12"><span>Divers : préciser</span><input type="text" data-bind="aut.diversTxt" value="${esc(f.autres.diversTxt)}" placeholder="Ex. photocopies, fournitures…"></label></div>
    <div><div class="eyebrow" style="margin-bottom:6px">Justificatifs</div><div class="thumbs">${ps.map(x=>`<button class="thumb" data-act="editPiece" data-id="${x.id}">${imgTag(x.imgId)}<span><b class="ref">${ref[x.id]}</b> ${esc(TYPES[x.type]||"")}</span></button>`).join("")}<button class="addthumb" data-act="addFor" data-id="autres">${ICON.up}Ajouter</button></div></div>
  </article></fieldset>`;
}

/* ---------- Justificatifs ---------- */
function depOptions(f,val){return `<option value="">— À affecter —</option>`+sortedDeps(f).map(d=>`<option value="${d.id}" ${d.id===val?"selected":""}>${esc(depLabel(d,f))}</option>`).join("")+`<option value="autres" ${val==="autres"?"selected":""}>Autres frais</option>`+`<option value="__new">+ Nouveau déplacement à cette date</option>`}
function pieceCard(p,f,ref){
  const un=!isAssigned(p,f);
  return `<article class="card piece ${un?"unassigned":""}">
    <button class="img" data-act="editPiece" data-id="${p.id}" aria-label="Modifier le justificatif">${imgTag(p.imgId,TYPES[p.type])}</button>
    <div class="body">
      <div class="meta"><span class="ref">${ref[p.id]}</span><span class="chip acc">${esc(TYPES[p.type]||"Autre")}</span>${(p.type==="peage"||p.type==="parking")&&p.sens!=="na"?`<span class="chip">${p.sens==="retour"?"retour":"aller"}</span>`:""}${p.needsCheck?`<span class="chip warn">à vérifier</span>`:""}${p.doublon?`<span class="chip bad" title="Même date, heure et montant qu'un autre justificatif">doublon ?</span>`:""}<span class="amt">${p.montant!=null&&p.montant!==""?eur(p.montant):""}</span></div>
      <div class="when">${p.date?fdate(p.date):"date ?"}${p.heure?" · "+esc(p.heure):""}</div>
      <div class="desc">${esc(p.resume||p.emetteur||"")}</div>
      <select data-assign="${p.id}" aria-label="Déplacement">${depOptions(f,isAssigned(p,f)?p.depId:"")}</select>
    </div></article>`;
}
function viewPieces(){
  const f=cur();const {ref}=pieceOrder(f);
  const jobs=st.jobs.map(j=>`<div class="job">${j.done?(j.error?"⚠️":"✓"):'<span class="spin"></span>'}<span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><b>${esc(j.name)}</b> — ${esc(j.status)}</span></div>`).join("");
  const groups=[];
  sortedDeps(f).forEach(d=>{const ps=f.pieces.filter(p=>p.depId===d.id);if(ps.length)groups.push([depLabel(d,f),eur(depCalc(d,f).total),ps])});
  const au=f.pieces.filter(p=>p.depId==="autres");if(au.length)groups.push(["Autres frais","",au]);
  const un=f.pieces.filter(p=>!isAssigned(p,f));
  const byRef=(a,b)=>parseInt(ref[a.id].slice(1))-parseInt(ref[b.id].slice(1));
  return `<div class="section-head"><div><div class="eyebrow">${esc(f.titre)}${periode(f)?" · "+esc(periode(f)):""}</div><h2>Justificatifs</h2></div></div>
  ${locked(f)?`<div class="fr-notice info">Fiche ${STATUTS[f.statut][0].toLowerCase()} : ajout de justificatifs fermé.</div>`:`<div class="drop" id="drop">
    <div class="txt"><b>Numériser des justificatifs</b><div class="small mut">Photo ou scan d'un ou plusieurs tickets (péage, parking, restaurant…), convocations en PDF ou en image. Chaque pièce est détourée, redressée dans le sens de lecture, classée, datée puis affectée au déplacement du même jour. La lecture se fait sur ton appareil : rien n'est envoyé.</div></div>
    <div class="row"><button class="btn" data-act="cam">${ICON.cam}Prendre une photo</button><button class="btn sec" data-act="pick">${ICON.up}Importer des fichiers</button></div>
  </div>
  <div class="row small" style="margin-top:10px"><label for="cutMode" class="mut">Découpage des photos</label><select id="cutMode" style="width:auto;min-height:34px;padding:4px 8px"><option value="auto" ${st.cutMode!=="single"?"selected":""}>Plusieurs tickets possibles par photo</option><option value="single" ${st.cutMode==="single"?"selected":""}>Un seul justificatif par photo</option></select></div>`}
  ${jobs?`<div class="queue">${jobs}${st.jobs.every(j=>j.done)?`<button class="btn sm ghost" data-act="clearJobs" style="align-self:flex-start">Effacer la liste</button>`:""}</div>`:""}
  ${un.length?`<div class="group-title"><h3>À affecter</h3><span class="chip warn">${un.length}</span></div><div class="pgrid">${un.sort(byRef).map(p=>pieceCard(p,f,ref)).join("")}</div>`:""}
  ${groups.map(([t,tot,ps])=>`<div class="group-title"><h3>${esc(t)}</h3><span class="mut small num">${tot}</span></div><div class="pgrid">${ps.sort(byRef).map(p=>pieceCard(p,f,ref)).join("")}</div>`).join("")}
  ${!f.pieces.length&&!jobs?`<div class="fr-empty" style="margin-top:16px"><b>Aucun justificatif</b>Pose plusieurs tickets à plat sur une table, prends une seule photo : l'application les sépare.</div>`:""}`;
}

/* ---------- Récapitulatif ---------- */
function checks(f){
  const out=[];const c=ficheCalc(f);const i=f.decl||ident();const tr=tresoriere();
  if(!i.nom||!i.prenom)out.push(["bad","Nom et prénom manquants : relie ton compte à ta fiche (Mon compte)."]);
  if(!tr.email)out.push(["warn","Adresse de la trésorière inconnue : aucun mandat « Trésorier » actif dans les fiches."]);
  if(!f.deps.length&&!c.autres)out.push(["bad","La fiche ne contient aucun frais."]);
  f.deps.forEach(d=>{const lab=depLabel(d,f);const dc=depCalc(d,f);
    if(!d.date)out.push(["bad",lab+" : date manquante."]);
    if(!d.motif)out.push(["warn",lab+" : motif non choisi."]);
    if(!dc.kmBrut&&!d.passager)out.push(["warn",lab+" : aucun kilomètre."]);
    if(d.mode!=="hab"&&(d.legs||[]).some(l=>l.km==null))out.push(["warn",lab+" : une étape n'a pas de kilomètres."]);
    if(d.passager&&!d.conducteur)out.push(["warn",lab+" : covoiturage, nom du conducteur non indiqué."]);
    const ps=f.pieces.filter(x=>x.depId===d.id);
    if(!ps.some(x=>x.type==="convocation"))out.push(["warn",lab+" : pas de convocation jointe."]);
    if(n(d.peageA)+n(d.peageR)>0&&!ps.some(x=>x.type==="peage"))out.push(["warn",lab+" : péages déclarés sans ticket."]);
    if(n(d.parkA)+n(d.parkR)>0&&!ps.some(x=>x.type==="parking"))out.push(["warn",lab+" : parking déclaré sans ticket."]);
    (d.repas||[]).filter(m=>!repasOk(m,f)).forEach(()=>out.push(["warn",lab+" : un repas sans ticket ne sera pas remboursé."]));
    ps.filter(x=>x.date&&d.date&&x.date!==d.date&&x.type!=="convocation").forEach(x=>out.push(["warn",`${lab} : un justificatif est daté du ${fdate(x.date)}.`]));
  });
  const un=f.pieces.filter(x=>!isAssigned(x,f));if(un.length)out.push(["bad",`${un.length} justificatif${un.length>1?"s":""} non affecté${un.length>1?"s":""} (onglet Justificatifs).`]);
  const chk=f.pieces.filter(x=>x.needsCheck);if(chk.length)out.push(["warn",`${chk.length} justificatif${chk.length>1?"s":""} à vérifier (date ou montant non lus).`]);
  const dbl=f.pieces.filter(x=>x.doublon);if(dbl.length)out.push(["warn",`${dbl.length} justificatif${dbl.length>1?"s":""} en double possible (même date, heure et montant).`]);
  if(!out.length)out.push(["ok","Tout est prêt à être envoyé."]);
  return out;
}
function mailText(f){
  const i=f.decl||ident(),c=ficheCalc(f),{list,ref}=pieceOrder(f),tr=tresoriere();
  const L=[];const nm=[i.prenom,i.nom].filter(Boolean).join(" ");
  L.push(`Objet : [SNETAA-FO] Déclaration de frais – ${f.titre} – ${nm}`,"");
  L.push(`Bonjour${tr.nom?" "+tr.nom.split(" ")[0]:""},`,"");
  L.push(`Tu trouveras ci-joint ma fiche de remboursement de frais (${f.titre}${periode(f)?", déplacements "+periode(f):""}), avec ${list.length} justificatif${list.length>1?"s":""} (fichier PDF).`,"");
  L.push("Récapitulatif :");
  sortedDeps(f).forEach((d,k)=>{const dc=depCalc(d,f);const parts=[];
    if(dc.km)parts.push(`${kmTxt(dc.km)} = ${eur(dc.ik)}`);if(dc.peages)parts.push(`péages ${eur(dc.peages)}`);if(dc.parking)parts.push(`parking ${eur(dc.parking)}`);if(dc.repas)parts.push(`repas ${eur(dc.repas)}`);
    const js=f.pieces.filter(x=>x.depId===d.id).map(x=>ref[x.id]);
    L.push(`- D${k+1} ${fdate(d.date)} – ${motifTxt(d)}${trajetTxt(d)?" – "+trajetTxt(d):""} : ${parts.join(" + ")||"0"} → ${eur(dc.total)}${js.length?` (justif. ${js.join(", ")})`:""}`)});
  if(c.autres){const a=f.autres;const parts=[];if(n(a.postal))parts.push(`envois postaux ${eur(a.postal)}`);if(n(a.internet))parts.push(`internet/téléphonie ${eur(a.internet)}`);if(n(a.divers))parts.push(`divers${a.diversTxt?" ("+a.diversTxt+")":""} ${eur(a.divers)}`);L.push(`- Autres frais : ${parts.join(" + ")} → ${eur(c.autres)}`)}
  L.push("",`Total à rembourser : ${eur(c.total)}`,"");
  L.push("Bien syndicalement,",nm,i.fonction||"");
  return L.join("\n");
}
function recapTable(f){
  const c=ficheCalc(f),{ref}=pieceOrder(f);
  const rows=sortedDeps(f).map((d,i)=>{const dc=depCalc(d,f);const js=f.pieces.filter(x=>x.depId===d.id).map(x=>ref[x.id]);return `<tr><td class="num">D${i+1}</td><td class="num">${fdate(d.date)}</td><td>${esc(motifTxt(d))}</td><td>${esc(trajetTxt(d))}</td><td class="r num">${Math.round(dc.km*10)/10}</td><td class="r num">${eur(dc.ik)}</td><td class="r num">${eur(dc.peages)}</td><td class="r num">${eur(dc.parking)}</td><td class="r num">${dc.repas?eur(dc.repas):"—"}</td><td class="r num"><b>${eur(dc.total)}</b></td><td class="num small">${js.join(" ")}</td></tr>`}).join("");
  return `<div class="scroll-x"><table class="recap-table"><thead><tr><th>N°</th><th>Date</th><th>Motif</th><th>Trajet</th><th class="r">Km</th><th class="r">Indemn. km</th><th class="r">Péages</th><th class="r">Parking</th><th class="r">Repas</th><th class="r">Total</th><th>Justif.</th></tr></thead>
  <tbody>${rows||`<tr><td colspan="11" class="mut">Aucun déplacement.</td></tr>`}
  ${c.autres?`<tr><td></td><td></td><td colspan="7">Autres frais : ${[n(f.autres.postal)?"envois postaux "+eur(f.autres.postal):"",n(f.autres.internet)?"internet/téléphonie "+eur(f.autres.internet):"",n(f.autres.divers)?"divers "+(f.autres.diversTxt?"("+esc(f.autres.diversTxt)+") ":"")+eur(f.autres.divers):""].filter(Boolean).join(" · ")}</td><td class="r num"><b>${eur(c.autres)}</b></td><td class="num small">${f.pieces.filter(x=>x.depId==="autres").map(x=>ref[x.id]).join(" ")}</td></tr>`:""}</tbody>
  <tfoot><tr><td colspan="4">Total</td><td class="r num">${Math.round(c.km*10)/10}</td><td class="r num">${eur(c.ik)}</td><td class="r num">${eur(c.peages)}</td><td class="r num">${eur(c.parking)}</td><td class="r num">${eur(c.repas)}</td><td class="r num">${eur(c.total)}</td><td></td></tr></tfoot></table></div>`;
}
function viewRecap(){
  const f=cur(),c=ficheCalc(f),tr=tresoriere();const ch=checks(f);const admin=ME.role==="admin";
  const actions=f.statut==="brouillon"||f.statut==="corriger"
    ?`<button class="btn" data-act="askSend">Envoyer à la trésorière</button><div data-confirm="send"></div>`
    :f.statut==="envoyee"?`<button class="btn sm ghost" data-act="unsend">Repasser en brouillon</button>`:"";
  return `<div class="section-head"><div><div class="eyebrow">${esc(f.titre)}${periode(f)?" · "+esc(periode(f)):""} · déclarée le ${fdate(f.dateDecl)}</div><h2>Récapitulatif ${statutChip(f)}</h2></div><div class="row">${actions}</div></div>
  ${f.commentaire&&f.statut!=="brouillon"?`<div class="fr-notice ${f.statut==="corriger"?"":"info"}"><b>Trésorerie :</b> ${esc(f.commentaire)}</div>`:""}
  ${f.statut==="envoyee"&&!admin?`<div class="fr-notice info">Ta fiche part à la trésorière avec ton prochain envoi de retour : <button class="btn sm" data-act="retour">Envoyer mon retour maintenant</button></div>`:""}
  <div class="two" style="margin-bottom:16px">
    <div class="card pad stack">
      <fieldset class="fr-fs" ${locked(f)?"disabled":""}><div class="fr-grid"><label class="f c6"><span>Titre de la fiche</span><input type="text" data-bind="fic.titre" value="${esc(f.titre)}"></label><label class="f c6"><span>Date de déclaration</span><input type="date" data-bind="fic.dateDecl" value="${esc(f.dateDecl)}"></label></div></fieldset>
      <div class="eyebrow">Contrôles avant envoi</div><div class="checks">${ch.map(([k,t])=>`<div class="check ${k}">${k==="ok"?"✓":k==="bad"?"✕":"!"}<span>${esc(t)}</span></div>`).join("")}</div>
    </div>
    <div class="card pad stack">
      <div><div class="eyebrow">Remboursement total</div><div class="num" style="font-size:30px;font-weight:700;color:var(--navy)">${eur(c.total)}</div><div class="small mut">${f.deps.length} déplacement${f.deps.length>1?"s":""} · ${kmTxt(c.km)} · ${f.pieces.length} justificatif${f.pieces.length>1?"s":""}</div></div>
      <button class="btn" data-act="pdf" id="pdfBtn">${ICON.dl}Télécharger le PDF (fiche + justificatifs)</button>
      ${canShareFiles()?`<button class="btn sec" data-act="share">Partager le PDF (mail, messagerie…)</button>`:""}
      <button class="btn sec" data-act="mailto">Écrire le mail à la trésorière</button>
      <div class="small mut">Le mail s'ouvre dans ta messagerie (Thunderbird…) : joins-y le PDF téléchargé.</div>
      <div class="small mut">Trésorière : ${tr.email?`<b style="user-select:all">${esc(tr.email)}</b> ${tr.nom?"("+esc(tr.nom)+")":""}`:"inconnue (aucun mandat « Trésorier » actif)"}</div>
      <div id="pdfMsg" class="small"></div>
    </div>
  </div>
  ${recapTable(f)}
  ${(f.hist||[]).length?`<div class="small mut" style="margin-top:10px">Historique : ${f.hist.map(h=>`${fdate(String(h.le).slice(0,10))} ${esc(h.action)}${h.par?" ("+esc(userName(h.par))+")":""}`).join(" · ")}</div>`:""}
  <div class="section-head" style="margin-top:24px"><h2>Texte du mail</h2><div class="row"><button class="btn sm sec" data-act="copyMail">${ICON.copy}Copier</button><button class="btn sm sec" data-act="dlMail">${ICON.dl}.txt</button></div></div>
  <div class="mailbox" id="mailbox">${esc(mailText(f))}</div>
  ${!locked(f)?`<div class="row" style="margin-top:22px;justify-content:flex-end"><button class="btn sm ghost danger" data-act="askDelFiche">Supprimer cette fiche</button></div><div data-confirm="fiche"></div>`:""}`;
}

/* ---------- Réglages personnels ---------- */
function fichesCard(){
  const l=mine().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));const nSent=l.filter(f=>f.statut==="payee").length;
  return `<div class="card pad stack" id="mesFiches" style="margin-bottom:16px"><div class="row" style="justify-content:space-between"><div class="eyebrow">Mes fiches (${l.length})</div><button class="btn sm" data-act="newFiche">+ Nouvelle fiche</button></div>
   ${l.length?`<div class="stack" style="gap:8px">${l.map(f=>{const c=ficheCalc(f);return `<div style="border-top:1px solid var(--line);padding-top:8px"><div class="row" style="justify-content:space-between;gap:8px">
     <div style="min-width:0;flex:1 1 200px"><b>${esc(f.titre||"Sans titre")}</b> ${f.id===st.cur?`<span class="chip acc">ouverte</span>`:""} ${statutChip(f)}
       <div class="small mut">${f.deps.length} déplacement${f.deps.length>1?"s":""} · ${f.pieces.length} justificatif${f.pieces.length>1?"s":""} · <span class="num">${eur(c.total)}</span></div></div>
     <div class="row" style="gap:6px">${f.id!==st.cur?`<button class="btn sm" data-act="openFiche" data-id="${f.id}">Ouvrir</button>`:""}${["brouillon","corriger","payee"].includes(f.statut)?`<button class="btn sm ghost danger" data-act="askDelFicheId" data-id="${f.id}">Supprimer</button>`:""}</div></div>
     <div data-confirm="fi-${f.id}" style="margin-top:6px"></div></div>`}).join("")}</div>`:`<div class="small mut">Aucune fiche.</div>`}
   ${nSent?`<div><button class="btn sm ghost danger" data-act="askDelSent">Supprimer les ${nSent} fiche${nSent>1?"s":""} payée${nSent>1?"s":""}</button><div data-confirm="sent" style="margin-top:6px"></div></div>`:""}
   <div class="small mut">Une fiche supprimée l'est définitivement, avec ses photos. Une fiche envoyée ne peut pas être supprimée tant qu'elle n'est pas payée.</div></div>`;
}
function viewReg(){
  const pr=prof(),i=ident(),tr=tresoriere(),me=pr.uai&&etabDe(pr.uai);const per=ME.pid&&P.get(ME.pid);
  const dist=Object.entries(pr.distances).sort((a,b)=>a[0].localeCompare(b[0]));
  const lab=k=>k.split("|").map(x=>{const [t,...r]=x.split(":");const v=r.join(":");return t==="dom"?"Domicile":t==="etab"?((etabDe(v)||{}).nom||v):t==="lieu"?((lieux().find(l=>l.id===v)||{}).nom||v):v}).join(" ↔ ");
  return `<div class="section-head"><h2>Réglages</h2><span class="small mut">Tes photos de justificatifs restent sur cet appareil ; tes fiches sont rangées avec les données chiffrées de l'application.</span></div>
  ${fichesCard()}
  <div class="two">
   <div class="stack">
    <div class="card pad stack"><div class="eyebrow">Déclarant (repris de ta fiche)</div>
      <div><b>${esc([i.prenom,i.nom].join(" "))}</b><div class="small mut">${esc(i.email||"courriel non renseigné")}${per?"":" · compte non relié à une fiche (Mon compte)"}</div></div>
      <label class="f"><span>Fonction sur la fiche de frais</span><select data-pro="fonction"><option value="">Automatique : ${esc(fonctionAuto(per))}</option>${FONCTIONS.map(x=>`<option ${pr.fonction===x?"selected":""}>${esc(x)}</option>`).join("")}</select></label></div>
    <div class="card pad stack"><div class="eyebrow">Trésorière (reprise des mandats)</div><div>${tr.nom?`<b>${esc(tr.nom)}</b> · ${esc(tr.email||"courriel inconnu")}`:`<span class="mut">Aucun mandat « Trésorier » actif.</span>`}</div></div>
    <div class="card pad stack"><div class="eyebrow">Points de départ</div>
      <label class="f"><span>Adresse du domicile (visible de toi seul ; figure sur la fiche quand un trajet part du domicile)</span><input type="text" data-pro="adresse" value="${esc(pr.adresse||"")}" placeholder="N°, rue, code postal, ville"></label>
      <label class="f"><span>Mon établissement d'exercice</span><input list="frEtabs" data-pro="uai" value="${esc(me?me.nom+" — "+(me.ville||"")+" · "+me.uai:"")}" placeholder="Tape le nom ou la ville"></label>
      <label class="f"><span>Départ proposé par défaut</span><select data-pro="depart">${selOpts([["dom","Domicile"],["monetab","Mon établissement"]],pr.depart)}</select></label>
      <label class="row small" style="gap:8px"><input type="checkbox" data-pro="autoDep" ${pr.autoDep?"checked":""}> Créer automatiquement un déplacement pour les justificatifs datés d'un jour sans déplacement</label></div>
    <div class="card pad stack"><div class="eyebrow">Signature (apposée sur le PDF)</div>
      <canvas class="sig" id="sig" width="840" height="280"></canvas>
      <div class="row"><button class="btn sm sec" data-act="sigClear">Effacer</button><button class="btn sm sec" data-act="sigImport">Importer une signature (image)</button><span class="small mut" id="sigMsg">${pr.signature?"Signature enregistrée.":"Signe avec le doigt ou la souris."}</span></div></div>
   </div>
   <div class="stack">
    <div class="card pad stack"><div class="eyebrow">Mes distances enregistrées (${dist.length})</div>
      <div class="small mut">Elles passent avant le calcul d'itinéraire : corrige-les pour coller à ton trajet réel (détour, covoiturage…).</div>
      ${dist.map(([k,v])=>`<div class="trajet-row"><span class="small">${esc(lab(k))}</span><input type="number" min="0" step="0.1" inputmode="decimal" data-dist="${esc(k)}" value="${n(v.km)}" aria-label="Km"><button class="btn sm ghost danger" data-act="delDist" data-i="${esc(k)}" aria-label="Supprimer">✕</button></div>`).join("")||`<div class="small mut">Aucune pour l'instant : chaque distance saisie ou calculée s'enregistre ici.</div>`}</div>
    <div class="card pad stack"><div class="eyebrow">Mes émetteurs habituels (${(pr.emetteurs||[]).length})</div>
      <div class="small mut">Reconnus d'office sur les tickets, avant la liste intégrée (VINCI Autoroutes, APRR, Orléans Gestion, Indigo, McDonald's…). Pour en ajouter un : ouvre un justificatif, corrige l'émetteur et coche « Reconnaître automatiquement ».</div>
      ${(pr.emetteurs||[]).map((r,k)=>`<div class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" style="flex:1;min-width:0" value="${esc(r.mot)}" aria-label="Mot repéré" onchange="Frais._t.prof().emetteurs[${k}].mot=this.value;save()"><span class="small">→</span><input type="text" style="flex:1;min-width:0" value="${esc(r.emetteur)}" aria-label="Émetteur" onchange="Frais._t.prof().emetteurs[${k}].emetteur=this.value;save()"><span class="chip">${esc(TYPES[r.type]||"")}</span><button class="btn sm ghost danger" onclick="Frais._t.prof().emetteurs.splice(${k},1);save();Frais.page()">✕</button></div>`).join("")||'<span class="small mut">Aucun pour l’instant.</span>'}</div>
    <div class="card pad stack"><div class="eyebrow">Mes trajets habituels (mode « Trajet habituel »)</div>
      ${pr.trajets.map((t,k)=>`<div class="trajet-row"><input type="text" data-traj="${k}|label" value="${esc(t.label)}" aria-label="Trajet"><input type="number" min="0" inputmode="decimal" data-traj="${k}|km" value="${n(t.km)}" aria-label="Km"><button class="btn sm ghost danger" data-act="delTraj" data-i="${k}" aria-label="Supprimer">✕</button></div>`).join("")}
      <button class="btn sm sec" data-act="addTraj" style="align-self:flex-start">+ Ajouter un trajet</button></div>
    <div class="card pad stack"><div class="eyebrow">Sauvegarde des photos</div>
      <div class="small mut">Les photos des justificatifs sont dans ce navigateur. Pour les passer du téléphone à l'ordinateur : « ⇄ Photos ». Pour les mettre à l'abri : sauvegarde.</div>
      <div class="row"><button class="btn sm sec" data-qr="open">⇄ Transférer par QR code</button><button class="btn sm sec" data-act="backup">${ICON.dl}Sauvegarder</button><button class="btn sm sec" data-act="restore">${ICON.up}Restaurer</button></div>
      <div id="bkMsg" class="small"></div></div>
   </div>
  </div>`;
}
function initSigPad(){
  const c=$("#sig");if(!c)return;const ctx=c.getContext("2d");const pr=prof();
  if(pr.signature){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0,c.width,c.height);im.src=pr.signature}
  let drawing=false,last=null,dirty=false;
  const pos=e=>{const r=c.getBoundingClientRect();return[(e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height]};
  c.onpointerdown=e=>{drawing=true;last=pos(e);c.setPointerCapture(e.pointerId)};
  c.onpointermove=e=>{if(!drawing)return;const p=pos(e);ctx.strokeStyle="#1b2a55";ctx.lineWidth=4;ctx.lineCap="round";ctx.beginPath();ctx.moveTo(...last);ctx.lineTo(...p);ctx.stroke();last=p;dirty=true};
  c.onpointerup=c.onpointercancel=()=>{if(!drawing)return;drawing=false;if(dirty){pr.signature=c.toDataURL("image/png");touch(null);$("#sigMsg").textContent="Signature enregistrée."}};
}

/* ---------- Barème et listes communes (droit « régler ») ---------- */
function viewCommun(){
  const m=conf();const L=lieux();const dist=Object.entries(m.distances).sort((a,b)=>a[0].localeCompare(b[0]));
  const lab=k=>k.split("|").map(x=>{const [t,...r]=x.split(":");const v=r.join(":");return t==="etab"?((etabDe(v)||{}).nom||v):t==="lieu"?((L.find(l=>l.id===v)||{}).nom||v):t==="dom"?"Domicile":v}).join(" ↔ ");
  const perso=Object.entries(prof().distances).filter(([k])=>!/dom:/.test(k)&&!m.distances[k]);
  return `<div class="section-head"><h2>Barème et listes communes</h2><span class="small mut">Valables pour tous les déclarants.</span></div>
  <div class="two"><div class="stack">
   <div class="card pad stack"><div class="eyebrow">Barèmes (le barème en vigueur à la date du déplacement s'applique)</div>
     <div class="scroll-x"><table class="recap-table" style="min-width:0"><thead><tr><th>En vigueur depuis</th><th class="r">€ / km</th><th class="r">Repas max</th><th></th></tr></thead><tbody>
     ${m.baremes.slice().sort((a,b)=>(b.depuis||"").localeCompare(a.depuis||"")).map(b=>`<tr><td><input type="date" data-bar="${b.id}|depuis" value="${esc(b.depuis)}"></td><td><input type="number" step="0.01" min="0" data-bar="${b.id}|km" value="${n(b.km)}" style="width:90px"></td><td><input type="number" step="0.5" min="0" data-bar="${b.id}|repasMax" value="${n(b.repasMax)}" style="width:90px"></td><td>${m.baremes.length>1?`<button class="btn sm ghost danger" data-act="delBar" data-i="${b.id}">✕</button>`:""}</td></tr>`).join("")}</tbody></table></div>
     <button class="btn sm sec" data-act="addBar" style="align-self:flex-start">+ Nouveau barème (date d'effet)</button>
     <div class="small mut">Péages et parking : remboursés à 100 % sur justificatif. Repas : dépense réelle, dans la limite du maximum, sur justificatif ; plusieurs repas possibles par déplacement.</div></div>
   <div class="card pad stack"><div class="eyebrow">Motifs</div><textarea data-motifs rows="10" aria-label="Motifs, un par ligne">${esc(m.motifs.join("\n"))}</textarea><span class="small mut">Un motif par ligne.</span></div>
  </div><div class="stack">
   <div class="card pad stack"><div class="eyebrow">Lieux de réunion habituels (destinations et convocations)</div>
     ${L.map((l,k)=>`<div class="fr-lieu"><input type="text" data-lieu="${k}|nom" value="${esc(l.nom)}" placeholder="Nom du lieu"><input type="text" data-lieu="${k}|adresse" value="${esc(l.adresse||"")}" placeholder="Adresse"><input type="text" data-lieu="${k}|cp" value="${esc(l.cp||"")}" placeholder="CP" style="width:80px"><input type="text" data-lieu="${k}|ville" value="${esc(l.ville||"")}" placeholder="Ville"><button class="btn sm ghost danger" data-act="delLieu" data-i="${k}">✕</button></div>`).join("")}
     <button class="btn sm sec" data-act="addLieu" style="align-self:flex-start">+ Ajouter un lieu</button><div class="small mut">Le rectorat et les DSDEN viennent de la liste des établissements et services.</div></div>
   <div class="card pad stack"><div class="eyebrow">Table commune des distances (${dist.length})</div>
     ${dist.map(([k,v])=>`<div class="trajet-row"><span class="small">${esc(lab(k))}</span><input type="number" min="0" step="0.1" data-cdist="${esc(k)}" value="${n(v.km)}"><button class="btn sm ghost danger" data-act="delCDist" data-i="${esc(k)}">✕</button></div>`).join("")||`<div class="small mut">Vide.</div>`}
     ${perso.length?`<div class="small"><b>Depuis mes distances</b> (hors domicile) :</div>${perso.map(([k,v])=>`<div class="row small" style="justify-content:space-between"><span>${esc(lab(k))} · ${kmTxt(v.km)}</span><button class="btn sm ghost" data-act="promoDist" data-i="${esc(k)}">→ table commune</button></div>`).join("")}`:""}</div>
  </div></div>`;
}

/* ---------- Toutes les déclarations (trésorière, secrétaire académique) ---------- */
function decl(f){return f.decl||ident(D.users.find(u=>u.id===f.userId)||{id:f.userId,nom:"?",prenom:""})}
function listeTous(){const t=st.tf;return all().filter(f=>f.statut!=="brouillon"&&(!t.m||f.userId===t.m)&&(!t.p||f.mois===t.p)&&(!t.s||f.statut===t.s)).sort((a,b)=>(b.mois||"").localeCompare(a.mois||"")||(decl(a).nom||"").localeCompare(decl(b).nom||""))}
function viewTous(){
  const t=st.tf;const base=all().filter(f=>f.statut!=="brouillon");
  const membres=[...new Map(base.map(f=>[f.userId,decl(f)])).entries()];const mois=[...new Set(base.map(f=>f.mois).filter(Boolean))].sort().reverse();
  const l=listeTous();const tot=r2(l.reduce((a,f)=>a+ficheCalc(f).total,0));
  return `<div class="section-head"><div><div class="eyebrow">Déclarations envoyées</div><h2>Toutes les déclarations</h2></div><button class="btn sm sec" data-act="exportTous">${ICON.dl}Tableau Excel</button></div>
  <div class="card pad row" style="gap:12px">
    <label class="f"><span>Membre</span><select data-tf="m"><option value="">Tous</option>${membres.map(([id,i])=>`<option value="${id}" ${t.m===id?"selected":""}>${esc(i.nom+" "+i.prenom)}</option>`).join("")}</select></label>
    <label class="f"><span>Créée en</span><select data-tf="p"><option value="">Tous les mois</option>${mois.map(m=>`<option value="${m}" ${t.p===m?"selected":""}>${MOIS[+m.slice(5,7)-1]} ${m.slice(0,4)}</option>`).join("")}</select></label>
    <label class="f"><span>Statut</span><select data-tf="s"><option value="">Tous</option>${Object.entries(STATUTS).filter(([k])=>k!=="brouillon").map(([k,v])=>`<option value="${k}" ${t.s===k?"selected":""}>${v[0]}</option>`).join("")}</select></label>
    <div class="f"><span class="small mut">${plural(l.length,"fiche")} · total</span><b class="num">${eur(tot)}</b></div></div>
  <div class="scroll-x" style="margin-top:12px"><table class="recap-table"><thead><tr><th>Membre</th><th>Période</th><th class="r">Montant</th><th>Statut</th><th>Envoyée</th><th></th></tr></thead><tbody>
  ${l.map(f=>{const i=decl(f);return `<tr><td><b>${esc(i.nom)}</b> ${esc(i.prenom)}<div class="small mut">${esc(i.fonction||"")}</div></td><td>${esc(f.titre)}</td><td class="r num">${eur(ficheCalc(f).total)}</td><td>${statutChip(f)}${f.commentaire?`<div class="small mut">${esc(f.commentaire)}</div>`:""}</td><td class="num small">${fdate(f.envoyeLe)}</td><td><button class="btn sm" data-act="voirFiche" data-id="${f.id}">Ouvrir</button></td></tr>`}).join("")||`<tr><td colspan="6" class="mut">Aucune déclaration pour ce choix.</td></tr>`}</tbody></table></div>
  <div class="small mut" style="margin-top:8px">Seules les fiches envoyées apparaissent ici (jamais les brouillons). Les photos des justificatifs sont dans le PDF que le déclarant t'envoie par mail.</div>`;
}
function voirFiche(id){
  const f=get(id);if(!f)return;const i=decl(f),c=ficheCalc(f);
  const m=modal(`<div class="sheet" role="dialog" aria-modal="true" style="max-width:980px"><div class="sheet-head"><h3>${esc(i.prenom+" "+i.nom)} · ${esc(f.titre)} ${statutChip(f)}</h3><button class="btn sm sec" data-x="close">Fermer</button></div>
    <div class="small mut" style="margin-bottom:8px">${esc(i.fonction||"")} · ${esc(i.email||"")} · envoyée le ${fdate(f.envoyeLe)} · barème : ${esc(bareTxt(bareme(f.deps[0]&&f.deps[0].date)))}</div>
    ${recapTable(f)}
    <div class="fr-grid" style="margin-top:14px">
      <label class="f c12"><span>Commentaire pour le déclarant</span><textarea id="trCom" rows="2">${esc(f.commentaire||"")}</textarea></label>
      <div class="c12 row"><button class="btn" data-x="valider" ${f.statut==="payee"?"disabled":""}>✓ Valider</button><button class="btn sec" data-x="corriger" ${f.statut==="payee"?"disabled":""}>À corriger</button>
      <span style="flex:1"></span><label class="f"><span>Payée le</span><input type="date" id="trDate" value="${esc(f.payeeLe||today())}"></label>${D.treso&&D.treso.comptes&&D.treso.comptes.length?`<label class="f"><span>Compte</span><select id="trCpt">${D.treso.comptes.map(x=>`<option value="${x.id}">${esc(x.nom)}</option>`).join("")}</select></label><label class="small" style="display:flex;gap:4px;align-items:center"><input type="checkbox" id="trEcr" ${f.ecritureId?"":"checked"}> écriture en trésorerie</label>`:""}<button class="btn" data-x="payer" ${f.statut==="payee"?"disabled":""}>€ Payée</button></div>
      <div class="c12 row"><button class="btn sm sec" data-x="pdf">${ICON.dl}PDF de la fiche</button><span class="small mut" id="trMsg"></span></div>
    </div>
    ${(f.hist||[]).length?`<div class="small mut" style="margin-top:10px">Historique : ${f.hist.map(h=>`${fdate(String(h.le).slice(0,10))} ${esc(h.action)}${h.par?" ("+esc(userName(h.par))+")":""}${h.com?" « "+esc(h.com)+" »":""}`).join(" · ")}</div>`:""}
  </div>`,async(a,root)=>{
    const com=root.querySelector("#trCom").value.trim();
    if(a==="close")return closeModal();
    if(a==="pdf")return makePdf(f,null,{btn:root.querySelector('[data-x="pdf"]'),msg:root.querySelector("#trMsg")});
    if(a==="corriger"&&!com){root.querySelector("#trCom").focus();UI.toast("Écris ce qu'il faut corriger","r");return}
    traiter(f,a,com,root);closeModal();renderView();
  });
}
function traiter(f,a,com,root){
  f.commentaire=com;f.traiteLe=Date.now();f.traitePar=ME.id;f.hist=f.hist||[];
  if(a==="valider"){f.statut="validee";f.hist.push({le:nowISO(),par:ME.id,action:"validée",com})}
  if(a==="corriger"){f.statut="corriger";f.hist.push({le:nowISO(),par:ME.id,action:"à corriger",com})}
  if(a==="payer"){f.statut="payee";f.payeeLe=root.querySelector("#trDate").value||today();f.hist.push({le:nowISO(),par:ME.id,action:"payée",com});
    const e=root.querySelector("#trEcr");if(e&&e.checked&&!f.ecritureId&&D.treso){const cat=(D.treso.categories||[]).find(c=>/frais|déplacement/i.test(c.nom)&&c.sens==="D");const i=decl(f);
      const ec={id:uid(),date:f.payeeLe,compteId:root.querySelector("#trCpt").value,libelle:"Frais "+i.prenom+" "+i.nom+" — "+f.titre,categorieId:cat?cat.id:"",montant:-ficheCalc(f).total,mode:"Virement",tiers:i.prenom+" "+i.nom,fraisId:f.id,par:ME.id};D.treso.ecritures.push(ec);f.ecritureId=ec.id}}
  touch(f);log("Frais "+(STATUTS[f.statut]||[f.statut])[0].toLowerCase(),f.titre+" · "+decl(f).nom);UI.renderNav();
}
function exportTous(){
  const l=listeTous();if(!l.length)return UI.toast("Rien à exporter","r");
  const fiches=l.map(f=>{const i=decl(f),c=ficheCalc(f);return{"Membre":i.nom+" "+i.prenom,"Fonction":i.fonction||"","Période":f.titre,"Statut":STATUTS[f.statut][0],"Envoyée le":fdate(f.envoyeLe),"Payée le":fdate(f.payeeLe),"Km":Math.round(c.km*10)/10,"Indemnités km":c.ik,"Péages":c.peages,"Parking":c.parking,"Repas":c.repas,"Autres frais":c.autres,"Total":c.total,"Commentaire":f.commentaire||""}});
  const deps=[];l.forEach(f=>{const i=decl(f);sortedDeps(f).forEach((d,k)=>{const dc=depCalc(d,f);deps.push({"Membre":i.nom+" "+i.prenom,"Période":f.titre,"N°":"D"+(k+1),"Date":fdate(d.date),"Motif":motifTxt(d),"Trajet":trajetTxt(d),"Km":Math.round(dc.km*10)/10,"€/km":dc.b.km,"Indemnités km":dc.ik,"Péages":dc.peages,"Parking":dc.parking,"Repas":dc.repas,"Total":dc.total})});
    const c=ficheCalc(f);if(c.autres)deps.push({"Membre":i.nom+" "+i.prenom,"Période":f.titre,"N°":"Autres","Motif":"Autres frais "+(f.autres.diversTxt||""),"Total":c.autres})});
  exportXLSX("frais_declarations_"+today(),{"Fiches":fiches,"Déplacements":deps});
}

/* ---------- Fenêtres (dans la page, sans confirm/alert) ---------- */
function modals(){if(!$("#frModal")){const a=document.createElement("div");a.className="fr-modal";a.id="frModal";a.hidden=true;document.body.appendChild(a);const b=document.createElement("div");b.className="fr-modal";b.id="frQr";b.hidden=true;document.body.appendChild(b);
  a.addEventListener("click",e=>{if(e.target===a&&!ed)closeModal()})}}
let modalCb=null;
function modal(html,cb){const m=$("#frModal");m.hidden=false;m.innerHTML=html;document.body.style.overflow="hidden";modalCb=cb||null;m.onclick=e=>{const b=e.target.closest("[data-x]");if(b&&modalCb)modalCb(b.dataset.x,m)};return m}
function closeModal(){const m=$("#frModal");if(!m)return;m.hidden=true;m.innerHTML="";document.body.style.overflow="";modalCb=null}

/* ============ Événements (délégués, limités au module) ============ */
const inFr=el=>!!(el&&el.closest&&el.closest("#frRoot"));
function setPt(f,d,idx,p){delete d._addPt;if(idx==="ret")d.retour=p;else{d.pts=d.pts||[];if(p)d.pts[+idx]=p;else d.pts.splice(+idx,1)}rebuildLegs(d);touch(f);renderView();autoCalc(f,d)}
function handleBind(el,isChange){
  const b=el.dataset.bind;const f=cur();if(!f)return;let val=el.type==="checkbox"?el.checked:el.value;
  const [scope,...rest]=b.split(".");
  if(scope==="dep"){const d=f.deps.find(x=>x.id===rest[0]);if(!d)return;const k=rest[1];
    if(["allerKm","retourKm","peageA","peageR","parkA","parkR"].includes(k))val=n(val);
    if(["peageA","peageR","parkA","parkR"].includes(k))d.auto=false;
    d[k]=val;
    if(el.dataset.traj){const t=prof().trajets.find(t=>t.label===val);d[el.dataset.traj]=t?n(t.km):(val==="Autre"?d[el.dataset.traj]:0);
      if(k==="aller"&&!d.retourHab&&val){d.retourHab=val;d.retourKm=d.allerKm}}
    if(k==="auto"&&val)applyAuto(f,d);
    if(k==="date"&&isChange){f.pieces.filter(p=>!isAssigned(p,f)&&p.date===val).forEach(p=>p.depId=d.id);applyAuto(f,d)}
    saveCur();
  }else if(scope==="aut"){f.autres[rest[0]]=rest[0]==="diversTxt"?val:n(val);saveCur()}
  else if(scope==="fic"){f[rest[0]]=val;saveCur();if(rest[0]==="titre")renderFichePick()}
  if(el.hasAttribute("data-rerender")&&isChange)renderView();else refreshTotals();
}
function refreshTotals(){
  const f=cur();if(!f)return;const c=ficheCalc(f);
  document.querySelectorAll("#frRoot [data-total]").forEach(el=>{const k=el.dataset.total;
    if(k==="fiche")el.textContent=eur(c.total);else if(k==="autres")el.textContent=eur(c.autres);
    else if(k.startsWith("ik-")){const d=f.deps.find(x=>x.id===k.slice(3));if(d){const dc=depCalc(d,f);el.textContent=eur(dc.ik);el.previousElementSibling.textContent=d.passager?`${kmTxt(dc.kmBrut)} parcourus · passager : 0 km`:`${kmTxt(dc.km)} × ${dc.b.km.toFixed(2).replace(".",",")} €`}}
    else{const d=f.deps.find(x=>x.id===k);if(d)el.textContent=eur(depCalc(d,f).total)}});
}
document.addEventListener("input",e=>{const t=e.target;if(!inFr(t))return;
  if(t.dataset.bind&&t.tagName!=="SELECT"&&t.type!=="checkbox")return handleBind(t,false);
  const f=cur();
  if(t.dataset.leg&&f){const [id,i]=t.dataset.leg.split("|");const d=f.deps.find(x=>x.id===id);const l=d&&d.legs[+i];if(l){l.km=t.value===""?null:n(t.value);l.src="saisi le "+fdate(today());if(t.value!=="")memoDist(l.a,l.b,l.km,"saisi");touch(f);refreshTotals()}return}
  if(t.dataset.repas&&f){const [id,mid]=t.dataset.repas.split("|");const d=f.deps.find(x=>x.id===id);const m=d&&d.repas.find(x=>x.id===mid);if(m){m.montant=n(t.value);touch(f);refreshTotals()}return}
});
document.addEventListener("change",e=>{const t=e.target;
  if(t.id==="trCom")return;
  if(!inFr(t))return;
  const f=cur(),pr=prof();
  if(t.id==="ficheSel"&&t.value==="__manage"){t.value=st.cur||"";st.tab="reg";renderView();setTimeout(()=>{const el=$("#mesFiches");el&&el.scrollIntoView({behavior:"smooth",block:"start"})},30);return}
  if(t.id==="ficheSel"){st.cur=t.value;try{localStorage.setItem("fs-cur",st.cur)}catch(_){}renderView();return}
  if(t.id==="fileIn"||t.id==="camIn"){const files=[...t.files];t.value="";if(files.length)ingest(files,st.pendingDep);st.pendingDep=null;return}
  if(t.id==="restoreIn"){const fl=t.files[0];t.value="";if(fl)restoreBackup(fl);return}
  if(t.id==="cutMode"){st.cutMode=t.value;try{localStorage.setItem("fs-cut",t.value)}catch(_){}return}
  if(t.dataset.assign){assignPiece(t.dataset.assign,t.value);return}
  if(t.dataset.pt&&f){const [id,idx]=t.dataset.pt.split("|");const d=f.deps.find(x=>x.id===id);if(!d)return;const v=t.value;
    if(v==="autreEtab"){const p={k:"etab",ref:"",_choix:1};if(idx==="ret")d.retour=p;else{d.pts=d.pts||[];d.pts[+idx]=p}renderView();const i=document.querySelector(`[data-ptetab="${id}|${idx}"]`);i&&i.focus();return}
    const p=!v?null:v==="dom"?{k:"dom"}:v==="monetab"?{k:"etab",ref:pr.uai}:v==="adr"?{k:"adr",adr:""}:v.startsWith("lieu:")?{k:"lieu",ref:v.slice(5)}:{k:"etab",ref:v.slice(5)};
    setPt(f,d,idx,p);return}
  if(t.dataset.ptadr&&f){const [id,idx]=t.dataset.ptadr.split("|");const d=f.deps.find(x=>x.id===id);if(d)setPt(f,d,idx,{k:"adr",adr:t.value.trim()});return}
  if(t.dataset.ptetab&&f){const [id,idx]=t.dataset.ptetab.split("|");const d=f.deps.find(x=>x.id===id);const m=t.value.match(/·\s*(\w{7,8})\s*$/);if(d&&m)setPt(f,d,idx,{k:"etab",ref:m[1]});else UI.toast("Choisis l'établissement dans la liste proposée","r");return}
  if(t.dataset.ret&&f){const d=f.deps.find(x=>x.id===t.dataset.ret);if(!d)return;if(t.value==="autre"){d.retour=d.retour||{k:"dom"}}else d.retour=null;rebuildLegs(d);touch(f);renderView();autoCalc(f,d);return}
  if(t.dataset.repaspap&&f){const [id,mid]=t.dataset.repaspap.split("|");const d=f.deps.find(x=>x.id===id);const m=d&&d.repas.find(x=>x.id===mid);if(m){m.papier=t.checked;touch(f);renderView()}return}
  if(t.dataset.pro){const k=t.dataset.pro;
    if(k==="uai"){const m=t.value.match(/·\s*(\w{7,8})\s*$/);pr.uai=m?m[1]:(t.value?pr.uai:"");if(t.value&&!m)UI.toast("Choisis ton établissement dans la liste proposée","r")}
    else pr[k]=t.type==="checkbox"?t.checked:t.value;
    if(k==="adresse")Object.keys(pr.distances).filter(x=>/dom:/.test(x)).forEach(x=>{if(pr.distances[x].src==="calc")delete pr.distances[x]});
    touch(null);renderView();return}
  if(t.dataset.traj){const [k,fld]=t.dataset.traj.split("|");const x=pr.trajets[+k];if(x){x[fld]=fld==="km"?n(t.value):t.value;touch(null)}return}
  if(t.dataset.dist){const x=pr.distances[t.dataset.dist];if(x){x.km=n(t.value);x.src="saisi";x.le=today();touch(null)}return}
  if(t.dataset.bar&&can("frais.regler")){const [id,fld]=t.dataset.bar.split("|");const b=conf().baremes.find(x=>x.id===id);if(b){b[fld]=fld==="depuis"?t.value:n(t.value);touch(null);log("Barème des frais modifié",fld+" = "+t.value)}return}
  if(t.dataset.motifs!==undefined&&can("frais.regler")){conf().motifs=t.value.split("\n").map(s=>s.trim()).filter(Boolean);touch(null);return}
  if(t.dataset.lieu&&can("frais.regler")){const [k,fld]=t.dataset.lieu.split("|");const l=lieux()[+k];if(l){l[fld]=t.value.trim();delete l.lat;delete l.lon;touch(null)}return}
  if(t.dataset.cdist&&can("frais.regler")){const x=conf().distances[t.dataset.cdist];if(x){x.km=n(t.value);touch(null)}return}
  if(t.dataset.tf){st.tf[t.dataset.tf]=t.value;renderView();return}
  if(t.dataset.bind)handleBind(t,true);
});
async function depuisReunion(rid){
  const r=(D.reunions||[]).find(x=>x.id===rid);if(!r)return;migrer();
  const f=ficheMois(String(r.date).slice(0,7),true);
  if(f.deps.some(d=>d.reunionId===rid)){st.cur=f.id;st.tab="deps";return}
  const d=newDep(r.date);d.reunionId=rid;
  const ty=(r.type||"")+" "+(r.titre||"");const mo=motifsList();
  const cand=/bureau acad/i.test(ty)?"Bureau académique":/conseil syndical/i.test(ty)?"Conseil syndical académique":/audience rectorat/i.test(ty)?"Audience rectorat":/congr/i.test(ty)?"Congrès académique":/F3SCT-?A/i.test(ty)?"F3SCT-A":/F3SCT-?D/i.test(ty)?"F3SCT-D":/CSA-?A/i.test(ty)?"CSA-A":/CSA-?D/i.test(ty)?"CSA-D":/CAPA/i.test(ty)?"CAPA":/établissement/i.test(ty)?"Visite établissement":"";
  if(cand&&mo.includes(cand))d.motif=cand;else{d.motif="Autre";d.motifAutre=r.titre||r.type||"Réunion"}
  const pr=prof();const dep=pr.depart==="monetab"&&pr.uai?{k:"etab",ref:pr.uai}:{k:"dom"};
  let dest=null;if(r.lieuId&&lieux().some(l=>l.id===r.lieuId))dest={k:"lieu",ref:r.lieuId};
  else{const t=norm(r.lieu||"");const l=lieux().find(x=>t&&norm(x.nom)&&t.includes(norm(x.nom)));if(l)dest={k:"lieu",ref:l.id};else{const e=D.etablissements.find(x=>t&&x.nom&&t.includes(norm(x.nom)));dest=e?{k:"etab",ref:e.uai}:(r.lieu?{k:"adr",adr:String(r.lieu).replace(/\n/g,", ")}:null)}}
  d.pts=[dep].concat(dest?[dest]:[]);rebuildLegs(d);f.deps.push(d);
  // convocation générée par l'application, jointe comme justificatif
  try{if(typeof ReuDocs!=="undefined"){const per=ME.pid&&P.get(ME.pid);const doc=await ReuDocs.pdfConvocation(r,per?ReuDocs.personne(per):null);const blob=doc.output("blob");
    const pages=await pdfToCanvases(blob,2);const ids=[];for(const c of pages.pages)ids.push(await Store.putImage(await toBlob(c,"image/jpeg",.85)));
    f.pieces.push(Object.assign(mkPiece({type:"convocation",date:r.date,resume:"Convocation – "+(r.titre||r.type||""),emetteur:"SNETAA-FO Orléans-Tours"},ids[0],FULL.map(p=>p.slice()),ids[0],{pages:ids,enhance:false,isDoc:true,nbPages:pages.total,keepSrc:true}),{depId:d.id,needsCheck:false}))}}catch(e){console.warn("convocation non jointe",e)}
  touch(f);st.cur=f.id;st.tab="deps";try{localStorage.setItem("fs-cur",f.id)}catch(_){}
  autoCalc(f,d);
}
function envoyer(f){
  f.statut="envoyee";f.envoyeLe=today();f.decl=ident();f.hist=f.hist||[];f.hist.push({le:nowISO(),par:ME.id,action:"envoyée"});
  f.baremes=[...new Set(f.deps.map(d=>bareme(d.date).id))].map(id=>clone(conf().baremes.find(b=>b.id===id)||{}));
  touch(f);log("Frais envoyés",f.titre+" · "+eur(ficheCalc(f).total));
}
document.addEventListener("click",async e=>{
  if(!inFr(e.target))return;
  const tb=e.target.closest("[data-tab]");if(tb){st.tab=tb.dataset.tab;renderView();window.scrollTo(0,0);return}
  const b=e.target.closest("[data-act]");if(!b)return;const a=b.dataset.act,id=b.dataset.id,f=cur(),pr=prof();
  const conf_=(sel,html)=>{const box=document.querySelector(sel);if(box)box.innerHTML=`<div class="confirm">${html}<button class="btn sm sec" data-act="cancelConfirm">Annuler</button></div>`};
  switch(a){
    case "newFiche":{const nf=newFiche();if(mine().some(x=>x.titre===nf.titre))nf.titre+=" (2)";all().push(nf);st.cur=nf.id;touch(nf);st.tab="deps";renderView();toast("Fiche « "+nf.titre+" » créée");break}
    case "addDep":{const d=newDep(today());d.pts=[pr.depart==="monetab"&&pr.uai?{k:"etab",ref:pr.uai}:{k:"dom"}];f.deps.push(d);saveCur();renderView();setTimeout(()=>{const el=document.querySelector(`[data-dep="${d.id}"]`);el&&el.scrollIntoView({behavior:"smooth",block:"start"})},30);break}
    case "dupDep":{const s=f.deps.find(x=>x.id===id);const d=Object.assign(clone(s),{id:uid(),date:"",reunionId:"",repas:[]});f.deps.push(d);saveCur();renderView();toast("Déplacement dupliqué : indique la date");break}
    case "askDelDep":{const np=f.pieces.filter(p=>p.depId===id).length;conf_(`[data-confirm="${id}"]`,`<span>Supprimer ce déplacement ?${np?` Ses ${np} justificatif(s) repasseront « à affecter ».`:""}</span><button class="btn sm danger" data-act="delDep" data-id="${id}">Supprimer</button>`);break}
    case "delDep":{f.deps=f.deps.filter(x=>x.id!==id);f.pieces.forEach(p=>{if(p.depId===id)p.depId=""});saveCur();renderView();break}
    case "cancelConfirm":b.closest("[data-confirm]").innerHTML="";break;
    case "mode":{const d=f.deps.find(x=>x.id===id);d.mode=b.dataset.v;if(d.mode!=="hab")rebuildLegs(d);saveCur();renderView();break}
    case "addPt":{const d=f.deps.find(x=>x.id===id);d._addPt=1;renderView();break}
    case "delPt":{const d=f.deps.find(x=>x.id===id);d.pts.splice(+b.dataset.i,1);rebuildLegs(d);saveCur();renderView();break}
    case "calcLeg":{const d=f.deps.find(x=>x.id===id);const l=d&&d.legs[+b.dataset.i];if(!l)break;if(!navigator.onLine){UI.toast("Hors ligne : saisis les kilomètres","r");break}
      b.disabled=true;const s=seq(d);try{const km=await calcLeg(s.find(p=>ptKey(p)===l.a),s.find(p=>ptKey(p)===l.b));l.km=km;l.src="calculé le "+fdate(today());delete l.err;memoDist(l.a,l.b,km,"calc");touch(f);renderView();toast(`Itinéraire IGN : ${kmTxt(km)}`)}catch(err){l.err=err.message;renderView();UI.toast("Calcul impossible : "+err.message,"r")}break}
    case "addRepas":{const d=f.deps.find(x=>x.id===id);d.repas=d.repas||[];d.repas.push({id:"r"+uid(),montant:0,manuel:true});saveCur();renderView();break}
    case "delRepas":{const d=f.deps.find(x=>x.id===id);d.repas=d.repas.filter(m=>m.id!==b.dataset.i);saveCur();renderView();break}
    case "depReu":{await depuisReunion(id);renderView();break}
    case "ignReu":{pr.ignoreReu=(pr.ignoreReu||[]).concat(id);touch(null);renderView();break}
    case "addFor":st.pendingDep=id;$("#fileIn").click();break;
    case "camFor":st.pendingDep=id;$("#camIn").click();break;
    case "pick":st.pendingDep=null;$("#fileIn").click();break;
    case "cam":st.pendingDep=null;$("#camIn").click();break;
    case "clearJobs":st.jobs=[];renderView();break;
    case "editPiece":openEditor(id);break;
    case "askSend":{const bad=checks(f).filter(x=>x[0]==="bad");conf_('[data-confirm="send"]',bad.length?`<span>${bad.length} point${bad.length>1?"s":""} bloquant${bad.length>1?"s":""} : ${esc(bad.map(x=>x[1]).join(" "))}</span>`:`<span>Envoyer la fiche « ${esc(f.titre)} » (${eur(ficheCalc(f).total)}) ? Elle ne sera plus modifiable, sauf si la trésorière la renvoie « à corriger ».</span><button class="btn sm" data-act="send">Envoyer</button>`);break}
    case "send":{envoyer(f);renderView();toast("Fiche envoyée : télécharge le PDF et écris le mail à la trésorière");break}
    case "unsend":{f.statut="brouillon";f.envoyeLe="";f.hist=(f.hist||[]).concat({le:nowISO(),par:ME.id,action:"repassée en brouillon"});saveCur();renderView();break}
    case "retour":{if(typeof Equipe!=="undefined"&&Equipe.envoyerRetour)Equipe.envoyerRetour();break}
    case "copyMail":copyText(mailText(f));break;
    case "dlMail":saveFile(`Mail frais ${f.titre}.txt`,mailText(f));break;
    case "pdf":makePdf(f);break;
    case "askDelFiche":conf_('[data-confirm="fiche"]',`<span>Supprimer la fiche « ${esc(f.titre)} » et ses ${f.pieces.length} justificatifs ? C'est définitif.</span><button class="btn sm danger" data-act="delFiche">Supprimer</button>`);break;
    case "delFiche":{const t=f.titre;deleteFiche(f.id);renderView();toast("Fiche « "+t+" » supprimée");break}
    case "askDelFicheId":{const g=get(id);if(!g)break;conf_(`[data-confirm="fi-${id}"]`,`<span>Supprimer « ${esc(g.titre)} » et ses ${g.pieces.length} justificatif${g.pieces.length>1?"s":""} ? C'est définitif.</span><button class="btn sm danger" data-act="delFicheId" data-id="${id}">Supprimer</button>`);break}
    case "delFicheId":{const g=get(id);if(!g)break;const t=g.titre;deleteFiche(id);renderView();toast("Fiche « "+t+" » supprimée");break}
    case "askDelSent":{const ids=mine().filter(x=>x.statut==="payee");conf_('[data-confirm="sent"]',`<span>Supprimer les ${ids.length} fiche${ids.length>1?"s":""} payée${ids.length>1?"s":""} et leurs photos ? C'est définitif.</span><button class="btn sm danger" data-act="delSent">Supprimer</button>`);break}
    case "delSent":{const ids=mine().filter(x=>x.statut==="payee").map(x=>x.id);ids.forEach(deleteFiche);renderView();toast(plural(ids.length,"fiche supprimée","fiches supprimées"));break}
    case "openFiche":st.cur=id;try{localStorage.setItem("fs-cur",id)}catch(_){}st.tab="deps";renderView();window.scrollTo(0,0);break;
    case "addTraj":pr.trajets.push({label:"",km:0});touch(null);renderView();break;
    case "delTraj":pr.trajets.splice(+b.dataset.i,1);touch(null);renderView();break;
    case "delDist":delete pr.distances[b.dataset.i];touch(null);renderView();break;
    case "backup":makeBackup();break;
    case "restore":$("#restoreIn").click();break;
    case "mailto":{const tr=tresoriere(),t=mailText(f);const lines=t.split("\n");const subj=lines[0].replace(/^Objet : /,"");const body=lines.slice(2).join("\n");location.href="mailto:"+encodeURIComponent(tr.email||"")+"?subject="+encodeURIComponent(subj)+"&body="+encodeURIComponent(body);break}
    case "share":makePdf(f,"share");break;
    case "sigClear":pr.signature="";touch(null);renderView();break;
    case "sigImport":{pickFile("image/*").then(async file=>{if(!file)return;const url=await blobToDataURL(file);const im=await loadImg(url);
      const k=Math.min(1,840/im.naturalWidth),c=document.createElement("canvas");c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,c.width,c.height);g.drawImage(im,0,0,c.width,c.height);
      pr.signature=c.toDataURL("image/jpeg",.85);touch(null);renderView();toast("Signature importée : elle sera apposée sur tes PDF")});break}
    case "voirFiche":voirFiche(id);break;
    case "exportTous":exportTous();break;
    case "addBar":if(can("frais.regler")){const l=conf().baremes;const last=l.slice().sort((x,y)=>(y.depuis||"").localeCompare(x.depuis||""))[0];l.push({id:"b"+uid(),depuis:today(),km:last.km,repasMax:last.repasMax});touch(null);renderView()}break;
    case "delBar":if(can("frais.regler")){conf().baremes=conf().baremes.filter(x=>x.id!==b.dataset.i);touch(null);renderView()}break;
    case "addLieu":if(can("frais.regler")){lieux().push({id:"l"+uid(),nom:"",adresse:"",cp:"",ville:""});touch(null);renderView()}break;
    case "delLieu":if(can("frais.regler")){lieux().splice(+b.dataset.i,1);touch(null);renderView()}break;
    case "delCDist":if(can("frais.regler")){delete conf().distances[b.dataset.i];touch(null);renderView()}break;
    case "promoDist":if(can("frais.regler")){conf().distances[b.dataset.i]={km:n(pr.distances[b.dataset.i].km),le:today()};touch(null);renderView()}break;
  }
});
/* glisser-déposer & coller */
document.addEventListener("dragover",e=>{if(st.tab!=="pieces"||!$("#drop"))return;e.preventDefault();$("#drop").classList.add("over")});
document.addEventListener("dragleave",()=>{const d=$("#drop");d&&d.classList.remove("over")});
document.addEventListener("drop",e=>{if(st.tab!=="pieces"||!$("#drop"))return;e.preventDefault();const fs=[...(e.dataTransfer.files||[])];if(fs.length)ingest(fs,null)});
document.addEventListener("paste",e=>{if(!$("#frRoot")||!cur()||locked(cur()))return;const fs=[...(e.clipboardData&&e.clipboardData.files||[])];if(fs.length){e.preventDefault();ingest(fs,null)}});

async function saveFile(filename,data){
  try{const blob=data instanceof Blob?data:new Blob([data],{type:/\.txt$/.test(filename)?"text/plain;charset=utf-8":/\.json$/.test(filename)?"application/json":"application/octet-stream"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=filename;a.rel="noopener";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return true}
  catch(e){console.error(e);toast("Téléchargement impossible sur ce navigateur.");return false}
}
function deleteFiche(fid){
  const f=get(fid);if(!f||f.userId!==ME.id)return;
  const used=new Set();mine().forEach(g=>{if(g.id!==fid)g.pieces.forEach(p=>[p.imgId,p.srcId].concat(p.pages||[]).forEach(x=>x&&used.add(x)))});
  const ids=new Set();f.pieces.forEach(p=>[p.imgId,p.srcId].concat(p.pages||[]).forEach(x=>x&&ids.add(x)));
  ids.forEach(x=>{if(!used.has(x))Store.delImage(x)});
  D.fraisFiches=all().filter(x=>x.id!==fid);D.fraisSupprimees=(D.fraisSupprimees||[]).concat(fid).slice(-300);touch(null);
  if(st.cur===fid){st.cur=(mine().sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0]||{}).id||null;try{localStorage.setItem("fs-cur",st.cur||"")}catch(_){}}
}
async function blobToDataURL(b){return new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)})}
async function makeBackup(){
  const msg=$("#bkMsg");msg.textContent="Préparation de la sauvegarde…";
  try{const ids=new Set();mine().forEach(f=>f.pieces.forEach(p=>{[p.imgId,p.srcId].concat(p.pages||[]).forEach(x=>x&&ids.add(x))}));
    const images={};let i=0;for(const id of ids){i++;msg.textContent=`Préparation de la sauvegarde… ${i}/${ids.size} images`;try{images[id]=await blobToDataURL(await Store.blob(id))}catch(_){}}
    const data=JSON.stringify({app:"frais-syndicaux",version:2,date:new Date().toISOString(),profil:prof(),fiches:Object.fromEntries(mine().map(f=>[f.id,f])),images});
    const ok=await saveFile(`Sauvegarde frais ${today()}.json`,data);
    msg.textContent=ok?`Sauvegarde créée (${(data.length/1048576).toFixed(1)} Mo).`:"";
  }catch(e){console.error(e);msg.textContent="Sauvegarde impossible : "+(e&&e.message||"erreur")}
}
async function restoreBackup(file){
  const msg=$("#bkMsg");if(msg)msg.textContent="Restauration…";
  try{const d=JSON.parse(await file.text());if(!d||d.app!=="frais-syndicaux"||!d.fiches)throw new Error("ce fichier n'est pas une sauvegarde de frais");
    const ent=Object.entries(d.images||{});let i=0;
    for(const [id,url] of ent){i++;if(msg)msg.textContent=`Restauration des images… ${i}/${ent.length}`;const bl=await (await fetch(url)).blob();await Store.idbOp("blobs","readwrite",s=>s.put(bl,id));if(Store.urls.has(id))URL.revokeObjectURL(Store.urls.get(id));Store.urls.set(id,URL.createObjectURL(bl))}
    let nf=0;for(const f of Object.values(d.fiches)){if(f.userId&&f.userId!==ME.id)continue;if(!f.userId)Object.assign(f,{userId:ME.id,mois:f.mois||"",hist:f.hist||[]});convertDep(f);const ex=get(f.id);if(ex){if((ex.maj||0)>(f.maj||f.updatedAt||0))continue;D.fraisFiches=all().filter(x=>x.id!==f.id)}all().push(f);nf++}
    if(d.profil)Object.assign(prof(),d.profil);else if(d.profile){const p=prof();if(d.profile.trajets&&!p.trajets.length)p.trajets=d.profile.trajets;if(d.profile.signature&&!p.signature)p.signature=d.profile.signature}
    touch(null);if(!cur())st.cur=(mine()[0]||{}).id||null;
    renderView();toast(`${plural(nf,"fiche restaurée","fiches restaurées")}`);
  }catch(e){console.error(e);if(msg)msg.textContent="Restauration impossible : "+(e&&e.message||"fichier illisible");else toast("Restauration impossible")}
}
function assignPiece(pid,val){
  const f=cur();const p=f.pieces.find(x=>x.id===pid);if(!p)return;const old=p.depId;
  if(val==="__new"){const d=newDep(p.date||today());if(p.type==="convocation"&&p.motif)d.motif=p.motif;f.deps.push(d);p.depId=d.id;toast("Déplacement créé : complète le trajet dans l'onglet Déplacements")}
  else p.depId=val;
  const od=f.deps.find(d=>d.id===old);if(od)applyAuto(f,od);applyAuto(f,f.deps.find(d=>d.id===p.depId));
  saveCur();renderView();
}
function autoAssign(f,p,preDep){
  if(preDep){p.depId=preDep;return}
  if(!p.date){p.depId="";return}
  const same=f.deps.filter(d=>d.date===p.date);
  if(same.length){p.depId=same[0].id;return}
  if(prof().autoDep&&["peage","parking","restaurant","carburant","transport","convocation","hebergement"].includes(p.type)){
    const d=newDep(p.date);const pr=prof();d.pts=[pr.depart==="monetab"&&pr.uai?{k:"etab",ref:pr.uai}:{k:"dom"}];if(p.type==="convocation"&&p.motif&&motifsList().includes(p.motif))d.motif=p.motif;else if(p.type==="convocation"&&p.motif){d.motif="Autre";d.motifAutre=p.motif}
    f.deps.push(d);p.depId=d.id;p._created=true;return}
  p.depId=["postal","telephonie"].includes(p.type)?"autres":"";
}

/* ============ Ingestion des justificatifs ============ */
function doublons(f,p){const k=x=>[x.type,x.date,x.heure,r2(n(x.montant))].join("|");if(!p.date||p.montant===""||p.montant==null)return false;
  return mine().some(g=>g.pieces.some(q=>q.id!==p.id&&q.date&&k(q)===k(p)))}
async function ingest(files,preDep){
  const f=cur();if(!f||locked(f))return;const fid=f.id;
  if(st.tab!=="pieces"&&!preDep)st.tab="pieces";
  for(const file of files){
    const job={id:uid(),name:file.name||"Photo",status:"préparation…",done:false};st.jobs.push(job);renderView();
    const upd=s=>{job.status=s;renderView()};
    try{
      const isPdf=file.type==="application/pdf"||/\.pdf$/i.test(file.name||"");
      const made=[];let readOk=true;let pageScan=null,tcQuads=null;
      if(isPdf&&st.cutMode!=="single"){ // scan de plusieurs tickets enregistré en PDF : on le traite comme une photo
        upd("lecture du PDF…");const r0=await pdfToCanvases(file);
        if(r0.pages.length===1&&(!r0.text||r0.text.replace(/\s/g,"").length<30)){const tc=textClusters(r0.pages[0]);if(tc.length>=2){pageScan=r0.pages[0];tcQuads=tc}}
      }
      if(isPdf&&!pageScan){
        upd("lecture du PDF…");const r=await pdfToCanvases(file);
        const ids=[];for(const c of r.pages){ids.push(await Store.putImage(await toBlob(c,"image/jpeg",.85)))}
        ids.forEach((id,i)=>srcCache.set(id,r.pages[i]));
        let text=r.text;if(!text||text.replace(/\s/g,"").length<30){upd("lecture du texte de la page…");ocrLog=p=>{job.status=`lecture du texte… ${Math.round(p*100)} %`;const el=document.querySelector(".queue");if(el)renderView()};text=await ocrPlain(r.pages[0]);ocrLog=null}
        const a=parseText(text,true);if(!text)readOk=false;
        made.push(mkPiece(a,ids[0],FULL.map(p=>p.slice()),ids[0],{pages:ids,enhance:false,isDoc:true,nbPages:r.total,keepSrc:true}));
      }else{
        const canvas=pageScan||await fileToCanvas(file);
        upd("enregistrement de l'original…");
        const srcId=await Store.putImage(await toBlob(canvas,"image/jpeg",.85));srcCache.set(srcId,canvas);
        upd("recherche des justificatifs sur la photo…");await sleep(30);
        let quads=tcQuads||(st.cutMode==="single"?[]:detectPieces(canvas));
        if(!quads.length)quads=[refineCorners(canvas,FULL,true)||FULL.map(p=>p.slice())];
        for(let pass=0;pass<2;pass++){const ici=[];
        let i=0;
        for(const q of quads){i++;const pre=quads.length>1?`pièce ${i}/${quads.length} : `:"";
          upd(pre+"redressement…");await sleep(10);
          const w0=warp(canvas,q,0,true);
          ocrLog=p=>{job.status=`${pre}lecture du texte… ${Math.round(p*100)} %`;const el=$("#frView");if(el&&st.tab==="pieces")renderView()};
          const o=await ocrBest(w0,s=>upd(pre+s));ocrLog=null;if(!o.ok)readOk=false;
          let a=parseText(o.text,false);
          // une seule pièce et lecture incomplète : on relit la photo entière (le détourage a pu couper le haut ou le bas du ticket)
          if(quads.length===1&&(!a.date||a.montant===""||(a.mconf||0)<2||a.type==="autre"||!a.connu)){
            upd("relecture de la photo entière…");let o2=null;try{const w=await getOcr();const r=await w.recognize(rotCanvas(scaled(canvas,2000),o.rot||0));o2={text:r.data.text||""}}catch(e){console.warn(e)}
            if(o2&&o2.text){const b=parseText(o2.text,false),both=parseText(o.text+"\n"+o2.text,false);
              a=Object.assign({},a,{date:a.date||b.date,heure:a.heure||b.heure,montant:a.montant===""||(b.montant!==""&&(b.mconf||0)>(a.mconf||0))?b.montant:a.montant,motif:a.motif||b.motif});
              if(b.connu||both.connu){const k=b.connu?b:both;a.type=k.type;a.emetteur=k.emetteur;a.sens=k.sens;a.connu=true}
              else if(a.type==="autre"&&b.type!=="autre"){a.type=b.type;a.emetteur=a.emetteur||b.emetteur}
              a.resume=[TYPES[a.type],a.emetteur].filter(Boolean).join(" – ");a.ocr=(a.ocr+"\n"+b.ocr).slice(0,3000);a.found=!!(a.date||a.montant)}}
          const pc=mkPiece(a,srcId,q,await Store.putImage(await toBlob(rotCanvas(w0,o.rot),"image/jpeg",.86)),{rot:o.rot,enhance:true});pc._vide=a.type==="autre"&&!a.date&&a.montant==="";ici.push(pc);
        }
        // découpage en trop (logo, ombre, pli) : les morceaux sans rien de lisible sont écartés ; si tout est vide, on relit la photo comme un seul ticket
        if(quads.length>1&&!tcQuads){const pleins=ici.filter(x=>!x._vide);ici.filter(x=>x._vide).forEach(x=>Store.delImage(x.imgId));
          if(pass===0&&(!pleins.length||(pleins.length===1&&(!pleins[0].date||pleins[0].montant==="")))){pleins.forEach(x=>Store.delImage(x.imgId));quads=[refineCorners(canvas,FULL,true)||FULL.map(p=>p.slice())];continue}
          ici.length=0;ici.push(...pleins)}
        ici.forEach(x=>{delete x._vide;made.push(x)});break}
      }
      const F=get(fid);if(!F)throw new Error("fiche supprimée");
      let created=0,dbl=0;
      made.forEach(p=>{if(doublons(F,p)){p.doublon=true;p.needsCheck=true;p.depId="";dbl++}else{autoAssign(F,p,preDep);if(p._created){created++;delete p._created}}F.pieces.push(p)});
      applyAutoAll(F);touch(F);
      job.done=true;const nCheck=made.filter(p=>p.needsCheck).length;
      job.status=`${made.length} justificatif${made.length>1?"s":""} ajouté${made.length>1?"s":""}${created?` · ${created} déplacement${created>1?"s":""} créé${created>1?"s":""}`:""}${nCheck?` · ${nCheck} à vérifier`:""}${dbl?` · ${dbl} déjà importé${dbl>1?"s":""} ?`:""}${readOk?"":" · lecture du texte indisponible"}`;
      if(nCheck||!readOk||dbl)job.error=true;
      if(dbl)UI.toast(dbl>1?dbl+" justificatifs semblent déjà importés (même date, heure et montant)":"Ce justificatif semble déjà importé (même date, heure et montant)","r");
      renderView();
      F.deps.forEach(d=>{if(d.mode!=="hab"){rebuildLegs(d);autoCalc(F,d)}});
    }catch(e){console.error(e);ocrLog=null;job.done=true;job.error=true;job.status="échec : "+(e&&e.message||"fichier illisible");renderView()}
  }
}
function mkPiece(a,srcId,corners,imgId,extra={}){
  const type=TYPES[a.type]?a.type:"autre";const heure=okTime(a.heure);
  const p={id:"p"+uid(),srcId,corners,rot:0,enhance:true,imgId,type,date:okDate(a.date),heure,montant:a.montant==null||a.montant===""?"":r2(n(a.montant)),emetteur:String(a.emetteur||""),lieu:"",resume:String(a.resume||""),motif:a.motif?String(a.motif):"",ocr:a.ocr||"",sens:a.sens||(type==="parking"?"na":guessSens(heure)),lu:{type,emetteur:String(a.emetteur||"")},depId:"",
    needsCheck:!okDate(a.date)||(type!=="convocation"&&(a.montant==null||a.montant===""))||type==="autre",addedAt:Date.now()};
  return Object.assign(p,extra);
}

/* ============ Transfert des photos par QR code animé (code fontaine LT) ============ */
async function buildBundle(fids,onProg){
  const fiches=fids.map(id=>clone(get(id)));const images=[],bins=[];const done=new Set();
  let total=0;fiches.forEach(f=>f.pieces.forEach(p=>total+=(p.isDoc&&p.pages?p.pages.length:1)));let k=0;
  for(const f of fiches)for(const p of f.pieces){
    const ids=p.isDoc&&p.pages&&p.pages.length?p.pages:[p.imgId];
    for(const id of ids){if(done.has(id)||!id)continue;done.add(id);onProg&&onProg(`Préparation des images… ${++k}/${total}`);
      try{const b=await shrinkImage(id,p.isDoc?1400:1000);images.push({id,len:b.length});bins.push(b)}catch(_){}}
    p.srcId=ids[0];if(!p.isDoc){p.corners=FULL.map(x=>x.slice());p.rot=0}p.enhance=false;p.transfered=true;
  }
  const meta={app:"frais-syndicaux",kind:"transfer",v:2,userId:ME.id,fiches,images};
  let js=new TextEncoder().encode(JSON.stringify(meta));let flag=0;const z=await gz(js,"c").catch(()=>null);if(z&&z.length<js.length){js=z;flag=1}
  const size=9+js.length+bins.reduce((a,b)=>a+b.length,0);const out=new Uint8Array(size);
  out.set([70,83,66,49],0);out[4]=flag;new DataView(out.buffer).setUint32(5,js.length);out.set(js,9);let o=9+js.length;for(const b of bins){out.set(b,o);o+=b.length}
  return out;
}
async function unpackBundle(u8){
  if(u8[0]!==70||u8[1]!==83||u8[2]!==66||u8[3]!==49)throw new Error("données reçues illisibles");
  const flag=u8[4],len=new DataView(u8.buffer,u8.byteOffset).getUint32(5);let js=u8.subarray(9,9+len);if(flag&1){js=await gz(js,"d");if(!js)throw new Error("ce navigateur ne sait pas décompresser les données")}
  const meta=JSON.parse(new TextDecoder().decode(js));let o=9+len;const imgs=[];for(const im of meta.images){imgs.push({id:im.id,bytes:u8.slice(o,o+im.len)});o+=im.len}
  return{meta,imgs};
}
async function importBundle(b){
  for(const im of b.imgs){const blob=new Blob([im.bytes],{type:"image/jpeg"});await Store.idbOp("blobs","readwrite",s=>s.put(blob,im.id));if(!Store.idb)Store._mem=(Store._mem||new Map()).set(im.id,blob);if(Store.urls.has(im.id))URL.revokeObjectURL(Store.urls.get(im.id));Store.urls.set(im.id,URL.createObjectURL(blob));srcCache.delete(im.id)}
  for(const f of b.meta.fiches){if(f.userId&&f.userId!==ME.id)continue;const ex=get(f.id);
    if(ex){ // les fiches suivent déjà le circuit chiffré : on ne remplace que si la version reçue est plus récente, sinon on complète les pièces
      if((f.maj||0)>(ex.maj||0)){D.fraisFiches=all().filter(x=>x.id!==f.id);all().push(f)}else f.pieces.forEach(p=>{if(!ex.pieces.some(q=>q.id===p.id))ex.pieces.push(p)})}
    else all().push(f)}
  touch(null);st.cur=b.meta.fiches[0]?b.meta.fiches[0].id:st.cur;
}
function qrClose(){qrStop();const m=$("#frQr");m.hidden=true;m.innerHTML="";document.body.style.overflow=""}
function qrOpen(){
  modals();qrStop();const m=$("#frQr");m.hidden=false;document.body.style.overflow="hidden";
  m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="qrT" style="max-width:640px">
   <div class="sheet-head"><h3 id="qrT">Transférer les photos entre appareils</h3><button class="btn sm sec" data-qr="close">Fermer</button></div>
   <div class="stack" id="qrBody">
    <div class="small mut">Les fiches se retrouvent sur tes appareils par la mise à jour de l'équipe ; les photos des justificatifs, elles, restent sur l'appareil qui les a prises. Pour les passer (par exemple du téléphone à l'ordinateur) : sur l'appareil qui a les photos, « Envoyer » affiche un QR code animé ; sur l'autre, « Recevoir » le filme.</div>
    <div class="two"><button class="btn" data-qr="send" style="min-height:64px">Envoyer depuis cet appareil</button><button class="btn sec" data-qr="recv" style="min-height:64px">${ICON.cam}Recevoir sur cet appareil</button></div>
   </div></div>`;
}
function qrSendSetup(){
  const f=cur();const nAll=mine().length;const phone=Math.min(screen.width,screen.height)<600;
  $("#qrBody").innerHTML=`<div class="fr-grid">
    <label class="f c12"><span>Que transférer ?</span><select id="qrWhat">${f?`<option value="cur">La fiche « ${esc(f.titre)} » (${f.pieces.length} justificatifs)</option>`:""}${nAll>1||!f?`<option value="all">Toutes mes fiches (${nAll})</option>`:""}</select></label>
    <label class="f c12"><span>Taille des QR codes</span><select id="qrDens"><option value="300" ${phone?"selected":""}>Gros points : plus lent, plus facile à filmer</option><option value="650" ${phone?"":"selected"}>Standard : plus rapide (grand écran)</option></select></label></div>
    <button class="btn" data-qr="start">Afficher le QR code</button><div id="qrMsg" class="small mut"></div>`;
}
async function qrStartSend(){
  const what=$("#qrWhat").value,B=+$("#qrDens").value;const msg=$("#qrMsg");
  try{await runLib("qrcode");
    const fids=what==="all"?mine().map(f=>f.id):[st.cur];msg.textContent="Préparation…";
    const data=await buildBundle(fids,t=>msg.textContent=t);
    const snd=makeSender(data,B);qrStop();qx={mode:"send",snd,fps:8,shown:0};
    try{if(navigator.wakeLock)qx.wake=await navigator.wakeLock.request("screen")}catch(_){}
    const est=s=>s<90?Math.ceil(s/10)*10+" s":Math.ceil(s/60)+" min";
    $("#qrBody").innerHTML=`<div class="small mut" id="qrInfo"></div>
      <div style="background:#fff;border-radius:10px;padding:6px;align-self:center;width:min(100%,62vh,560px)"><canvas id="qrCv" style="width:100%;display:block;image-rendering:pixelated"></canvas></div>
      <div class="row" style="justify-content:space-between"><label class="row small" style="gap:6px">Vitesse <input type="range" id="qrFps" min="3" max="15" value="8" style="width:140px"><span id="qrFpsV" class="num">8/s</span></label><button class="btn sm sec" data-qr="close">Terminer</button></div>
      <div class="fr-notice info small">Sur l'autre appareil : <b>⇄ Photos → Recevoir</b>, puis vise ce QR code. Luminosité au maximum, sans reflet. Laisse défiler jusqu'à « Transfert terminé ».</div>`;
    const info=()=>{const t=snd.K*1.3/(qx.fps*.7);$("#qrInfo").textContent=`${(snd.L/1024).toFixed(0)} Ko à transférer · durée estimée ${est(t)}`};info();
    const tick=()=>{if(!qx||qx.mode!=="send")return;const cv=$("#qrCv");if(!cv)return qrStop();drawQR(cv,snd.next())};
    tick();qx.timer=setInterval(tick,1000/qx.fps);
    $("#qrFps").oninput=e=>{qx.fps=+e.target.value;$("#qrFpsV").textContent=qx.fps+"/s";clearInterval(qx.timer);qx.timer=setInterval(tick,1000/qx.fps);info()};
  }catch(e){console.error(e);msg.textContent="Impossible de préparer le transfert : "+(e&&e.message||"erreur")}
}
async function qrStartRecv(){
  const body=$("#qrBody");
  body.innerHTML=`<div style="position:relative;background:#000;border-radius:10px;overflow:hidden;line-height:0"><video id="qrVid" playsinline muted style="width:100%;max-height:60vh;object-fit:contain"></video>
    <div style="position:absolute;inset:auto 0 0 0;padding:8px 10px;background:rgba(0,0,0,.6);color:#fff;line-height:1.3;font-size:13px"><div id="qrStat">Démarrage de la caméra…</div><div style="height:6px;background:rgba(255,255,255,.25);border-radius:3px;margin-top:6px"><div id="qrBar" style="height:100%;width:0;background:#6fcf98;border-radius:3px"></div></div></div></div>
    <div class="small mut">Vise le QR code de l'autre écran, à 20–40 cm. Les images manquées sont rattrapées automatiquement.</div><div id="qrRes"></div>`;
  try{await runLib("jsqr")}catch(_){}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){$("#qrStat").textContent="Caméra indisponible dans ce navigateur.";return}
  let stream;try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280},height:{ideal:720}},audio:false})}
  catch(e){$("#qrStat").textContent=e&&e.name==="NotAllowedError"?"Accès à la caméra refusé : autorise-le dans les réglages du navigateur.":"Caméra inaccessible : "+(e&&e.message||e);return}
  qrStop();const rcv=makeReceiver();qx={mode:"recv",stream,rcv,t0:0};
  const v=$("#qrVid");v.srcObject=stream;try{await v.play()}catch(_){}
  let det=null;try{if("BarcodeDetector" in window){const f=await window.BarcodeDetector.getSupportedFormats();if(f.includes("qr_code"))det=new window.BarcodeDetector({formats:["qr_code"]})}}catch(_){det=null}
  const cv=document.createElement("canvas");const cx=cv.getContext("2d",{willReadFrequently:true});
  const loop=async()=>{
    if(!qx||qx.mode!=="recv")return;
    try{if(v.readyState>=2){let text=null;
      if(det){const r=await det.detect(v);if(r&&r[0])text=r[0].rawValue}
      else if(window.jsQR){const s=Math.min(1,960/v.videoWidth);cv.width=Math.round(v.videoWidth*s);cv.height=Math.round(v.videoHeight*s);cx.drawImage(v,0,0,cv.width,cv.height);const r=window.jsQR(cx.getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height,{inversionAttempts:"dontInvert"});if(r)text=r.data}
      if(text&&rcv.add(text)){if(!qx.t0)qx.t0=Date.now();const p=rcv.progress();$("#qrBar").style.width=(p*100).toFixed(1)+"%";$("#qrStat").textContent=`Réception : ${(p*100).toFixed(0)} % · ${rcv.frames} images lues`}
      else if(!qx.t0)$("#qrStat").textContent="Recherche du QR code…";
      if(rcv.done){const data=rcv.data;qrStop();await qrReceived(data);return}}}catch(e){console.warn(e)}
    if(qx)qx.scanT=setTimeout(loop,det?40:15);
  };loop();
}
async function qrReceived(data){
  const res=$("#qrRes");$("#qrStat").textContent="Transfert terminé";$("#qrBar").style.width="100%";
  try{const b=await unpackBundle(data);qx={mode:"done",bundle:b};
    if(b.meta.userId&&b.meta.userId!==ME.id)throw new Error("ces fiches appartiennent à un autre compte");
    const nf=b.meta.fiches.length,np=b.meta.fiches.reduce((a,f)=>a+f.pieces.length,0);
    res.innerHTML=`<div class="card pad stack"><b>${nf} fiche${nf>1?"s":""} reçue${nf>1?"s":""} : ${b.meta.fiches.map(f=>esc(f.titre)).join(", ")} (${np} justificatif${np>1?"s":""})</b>
      <button class="btn" data-qr="import">Importer les photos</button></div>`;
  }catch(e){console.error(e);res.innerHTML=`<div class="fr-notice">Les données reçues sont inutilisables : ${esc(e&&e.message||"")}. Relance le transfert.</div>`}
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-qr]");if(!b){if(e.target.id==="frQr")qrClose();return}
  if(!inFr(b)&&!b.closest("#frQr"))return;
  const a=b.dataset.qr;
  if(a==="open")qrOpen();else if(a==="close")qrClose();else if(a==="send")qrSendSetup();else if(a==="start")qrStartSend();else if(a==="recv")qrStartRecv();
  else if(a==="import"&&qx&&qx.bundle){b.disabled=true;b.textContent="Import…";await importBundle(qx.bundle);qrClose();st.tab="deps";renderView();toast("Photos importées")}
});

/* ============ Éditeur de pièce ============ */
let ed=null;
async function openEditor(pid){
  const f=cur();const p=f.pieces.find(x=>x.id===pid);if(!p)return;modals();
  ed={pid,corners:clone(p.corners||FULL),rot:p.rot||0,enhance:p.enhance!==false,changed:false};
  const m=$("#frModal");m.hidden=false;document.body.style.overflow="hidden";m.onclick=null;
  const {ref}=pieceOrder(f);const lk=locked(f);
  m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="edT">
    <div class="sheet-head"><h3 id="edT"><span class="ref">${ref[p.id]}</span> ${esc(TYPES[p.type])}${p.isDoc&&p.pages&&p.pages.length>1?` · ${p.pages.length} pages`:""}</h3><button class="btn sm sec" data-ed="close">Fermer</button></div>
    <div class="editor">
      <div class="stack">
        <div class="eyebrow">Original : ajuste les 4 coins (① = haut du texte, à gauche)</div>
        <div class="cropbox" id="cropbox"><img id="cropImg" alt="Original" src="${esc(Store.url(p.srcId))}" data-img="${esc(p.srcId)}"><svg viewBox="0 0 1 1" preserveAspectRatio="none"><polygon id="cropPoly" fill="rgba(29,79,168,.18)" stroke="#fff" stroke-width=".004"/><line id="cropTop" stroke="#ffcf3f" stroke-width=".012"/></svg></div>
        <div class="row"><button class="btn sm sec" data-ed="rotL">${ICON.rotL}Pivoter</button><button class="btn sm sec" data-ed="rotR">${ICON.rotR}Pivoter</button><button class="btn sm sec" data-ed="snap">Ajuster au papier</button><button class="btn sm sec" data-ed="full">Image entière</button><label class="row small" style="gap:6px"><input type="checkbox" id="edEnh" ${ed.enhance?"checked":""}> Effet scan (contraste)</label></div>
      </div>
      <div class="stack">
        <div class="eyebrow">Résultat</div>
        <div class="preview" id="edPrev">${imgTag(p.imgId)}</div>
        <fieldset class="fr-fs" ${lk?"disabled":""}><div class="fr-grid">
          <label class="f c6"><span>Type</span><select id="edType">${selOpts(Object.entries(TYPES),p.type)}</select></label>
          <label class="f c6"><span>Montant TTC</span><div class="money"><input type="number" step="0.01" min="0" inputmode="decimal" id="edMontant" value="${esc(p.montant)}"></div></label>
          <label class="f c6"><span>Date</span><input type="date" id="edDate" value="${esc(p.date)}"></label>
          <label class="f c6"><span>Heure</span><input type="time" id="edHeure" value="${esc(p.heure)}"></label>
          <label class="f c12"><span>Description</span><input type="text" id="edResume" value="${esc(p.resume)}"></label>
          <label class="f c6"><span>Émetteur</span><input type="text" id="edEmet" value="${esc(p.emetteur)}" oninput="const c=document.getElementById('edLearn');if(c)c.checked=true"></label>
          <label class="f c6"><span>Trajet</span><select id="edSens">${selOpts([["na","—  (ni aller ni retour)"],["aller","Aller"],["retour","Retour"]],p.sens||"aller")}</select></label>
          <div class="c12 fr-notice info" style="display:flex;flex-direction:column;gap:6px"><label class="row small" style="gap:8px"><input type="checkbox" id="edLearn" ${p.lu&&p.lu.emetteur!==p.emetteur?"checked":""}> <b>Reconnaître automatiquement ce ticket la prochaine fois</b></label>
            <label class="f"><span>quand le ticket contient le mot (plusieurs : séparés par « ; »)</span><input type="text" id="edMot" value="${esc(motCle(p))}" placeholder="ex. COFIROUTE, HDU…"></label>
            <span class="small mut">→ émetteur, type et trajet ci-dessus seront repris d'office. Liste modifiable dans Réglages.</span></div>
          <label class="f c12"><span>Déplacement</span><select id="edDep">${depOptions(f,isAssigned(p,f)?p.depId:"")}</select></label>
        </div></fieldset>
        ${lk?"":`<div class="row" style="justify-content:space-between"><button class="btn sm ghost danger" data-ed="askDel">Supprimer</button><button class="btn" data-ed="save">Enregistrer</button></div>`}
        <div id="edConfirm"></div>
      </div>
    </div></div>`;
  const box=$("#cropbox");
  ["0","1","2","3"].forEach(i=>{const h=document.createElement("div");h.className="handle h"+i;h.textContent=["①","②","③","④"][i];h.dataset.h=i;box.appendChild(h)});
  { // description = type + émetteur, mise à jour tant qu'elle n'a pas été réécrite à la main
    const auto=()=>[TYPES[$("#edType").value],$("#edEmet").value.trim()].filter(Boolean).join(" – ");const R=$("#edResume");
    if(R){let libre=!!p.resume&&p.resume!==[TYPES[p.type],p.emetteur].filter(Boolean).join(" – ");const maj=()=>{if(!libre)R.value=auto()};
      if(!libre&&R.value!==auto())R.value=auto();
      $("#edType").addEventListener("change",maj);$("#edEmet").addEventListener("input",maj);R.addEventListener("input",()=>{libre=R.value.trim()!==""&&R.value!==auto()})}}
  drawCrop();
  let drag=null;
  box.addEventListener("pointerdown",e=>{const h=e.target.closest(".handle");if(!h)return;drag=+h.dataset.h;h.setPointerCapture(e.pointerId);e.preventDefault()});
  box.addEventListener("pointermove",e=>{if(drag==null)return;const r=box.getBoundingClientRect();ed.corners[drag]=[Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),Math.min(1,Math.max(0,(e.clientY-r.top)/r.height))];ed.changed=true;drawCrop()});
  const end=()=>{if(drag!=null){drag=null;previewWarp()}};box.addEventListener("pointerup",end);box.addEventListener("pointercancel",end);
}
function drawCrop(){
  const c=ed.corners;$("#cropPoly").setAttribute("points",c.map(p=>p.join(",")).join(" "));
  const t=$("#cropTop");t.setAttribute("x1",c[0][0]);t.setAttribute("y1",c[0][1]);t.setAttribute("x2",c[1][0]);t.setAttribute("y2",c[1][1]);
  document.querySelectorAll("#cropbox .handle").forEach(h=>{const p=c[+h.dataset.h];h.style.left=(p[0]*100)+"%";h.style.top=(p[1]*100)+"%"});
}
let prevT=0;
async function previewWarp(){
  const f=cur();const p=f.pieces.find(x=>x.id===ed.pid);const t=++prevT;
  try{const src=await getSrcCanvas(p.srcId);if(t!==prevT)return;const w=warp(src,ed.corners,ed.rot,ed.enhance,900);w.style.maxWidth="100%";const pv=$("#edPrev");if(pv){pv.innerHTML="";pv.appendChild(w)}}catch(e){console.error(e)}
}
function closeEditor(){closeModal();ed=null}
document.addEventListener("click",async e=>{
  const m=$("#frModal");if(!m||m.hidden||!ed)return;
  if(e.target===m){closeEditor();return}
  const b=e.target.closest("[data-ed]");if(!b||!m.contains(b))return;const a=b.dataset.ed;const f=cur();const p=f&&ed&&f.pieces.find(x=>x.id===ed.pid);if(!p)return closeEditor();
  if(a==="close")closeEditor();
  else if(a==="rotL"||a==="rotR"){ed.rot+=a==="rotL"?-1:1;ed.changed=true;previewWarp()}
  else if(a==="snap"){try{const src=await getSrcCanvas(p.srcId);const r=refineCorners(src,ed.corners,true);if(r){ed.corners=r;ed.changed=true;drawCrop();previewWarp()}else toast("Bord du papier non trouvé : ajuste les coins à la main")}catch(_){toast("Photo originale absente de cet appareil")}}
  else if(a==="full"){ed.corners=clone(FULL);ed.changed=true;drawCrop();previewWarp()}
  else if(a==="askDel")$("#edConfirm").innerHTML=`<div class="confirm"><span>Supprimer ce justificatif ?</span><button class="btn sm danger" data-ed="del">Supprimer</button><button class="btn sm sec" data-ed="noDel">Annuler</button></div>`;
  else if(a==="noDel")$("#edConfirm").innerHTML="";
  else if(a==="del"){const dep=p.depId;f.pieces=f.pieces.filter(x=>x!==p);const still=x=>f.pieces.some(q=>q.srcId===x);Store.delImage(p.imgId);(p.pages||[]).forEach(x=>{if(x!==p.imgId)Store.delImage(x)});if(!still(p.srcId))Store.delImage(p.srcId);applyAuto(f,f.deps.find(d=>d.id===dep));saveCur();closeEditor();renderView()}
  else if(a==="save"){
    b.disabled=true;b.textContent="Enregistrement…";
    const oldDep=p.depId;
    p.type=$("#edType").value;p.montant=$("#edMontant").value===""?"":r2(n($("#edMontant").value));p.date=$("#edDate").value;p.heure=$("#edHeure").value;p.resume=$("#edResume").value;p.emetteur=$("#edEmet").value;p.sens=$("#edSens").value;
    let dv=$("#edDep").value;if(dv==="__new"){const d=newDep(p.date||today());f.deps.push(d);dv=d.id}p.depId=dv;
    {const L=$("#edLearn"),mot=($("#edMot")||{}).value||"";if(L&&L.checked&&mot.trim()&&p.emetteur.trim()){const nb=apprendre({mot:mot.trim(),emetteur:p.emetteur.trim(),type:p.type,sens:p.sens});setTimeout(()=>toast("Retenu : « "+mot.trim()+" » → "+p.emetteur.trim()+(nb?` · ${nb} autre${nb>1?"s":""} justificatif${nb>1?"s":""} mis à jour`:"")),300)}}
    p.needsCheck=false;p.doublon=doublons(f,p);
    try{
      if(ed.changed||ed.enhance!==(p.enhance!==false)){
        const src=await getSrcCanvas(p.srcId);const w=warp(src,ed.corners,ed.rot,ed.enhance);const nid=await Store.putImage(await toBlob(w,"image/jpeg",.86));
        const old=p.imgId;p.imgId=nid;if(p.pages)p.pages[0]=nid;p.corners=ed.corners;p.rot=ed.rot;p.enhance=ed.enhance;if(old!==p.srcId)Store.delImage(old)}
    }catch(e){console.error(e);toast("Détourage non enregistré : photo originale absente de cet appareil")}
    applyAuto(f,f.deps.find(d=>d.id===oldDep));applyAuto(f,f.deps.find(d=>d.id===p.depId));
    saveCur();closeEditor();renderView();toast("Justificatif enregistré");
  }
});
document.addEventListener("change",e=>{if(e.target.id==="edEnh"&&ed){ed.enhance=e.target.checked;previewWarp()}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(ed)closeEditor();else if($("#frModal")&&!$("#frModal").hidden)closeModal()}});
async function imgForPdf(id){const b=await Store.blob(id);const url=await blobToDataURL(b);const im=await loadImg(url);return{url,w:im.naturalWidth,h:im.naturalHeight}}
function canShareFiles(){try{return !!(navigator.canShare&&window.File&&navigator.canShare({files:[new File(["x"],"t.pdf",{type:"application/pdf"})]}))}catch(_){return false}}
async function makePdf(f,how,o={}){
  const btn=o.btn||$("#pdfBtn"),msg=o.msg||$("#pdfMsg")||{};if(btn)btn.disabled=true;msg.textContent="Chargement du module PDF…";
  try{
    if(!window.jspdf)await runLib("jspdf");
    if(!window.jspdf)throw new Error("module PDF indisponible");
    msg.textContent="Préparation du PDF…";
    const {jsPDF}=window.jspdf;const doc=new jsPDF({unit:"mm",format:"a4"});{const cl=t=>String(t).replace(/→/g,"-").replace(/≤/g,"max.").replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/…/g,"...").replace(/[\u202f\u00a0]/g," ");const o=doc.text.bind(doc),sp=doc.splitTextToSize.bind(doc);doc.text=(t,...r)=>o(Array.isArray(t)?t.map(cl):cl(t),...r);doc.splitTextToSize=(t,...r)=>sp(cl(t),...r)}const p=f.decl||ident(),c=ficheCalc(f),{list,ref}=pieceOrder(f);const own=D.users.find(u=>u.id===f.userId)||ME;const sig=(own.frais||{}).signature||"";
    const W=210,M=12;const ink=[27,31,42],mute=[93,100,117],acc=[27,42,74],line=[205,209,218];
    const nm=[p.prenom,(p.nom||"").toUpperCase()].filter(Boolean).join(" ");
    let y=M;
    const T=(t,x,yy,o={})=>{doc.setFont("helvetica",o.b?"bold":"normal");doc.setFontSize(o.s||9);doc.setTextColor(...(o.c||ink));doc.text(String(t),x,yy,o.a?{align:o.a}:undefined)};
    const footer=()=>{const np=doc.getNumberOfPages();for(let i=1;i<=np;i++){doc.setPage(i);T(`${nm} · ${f.titre} · page ${i}/${np}`,W/2,290,{s:7.5,c:mute,a:"center"})}};
    // En-tête
    let lx=M;{const lg=LOGO_SNETAA;try{const li=await loadImg(lg);const r=li.naturalHeight/li.naturalWidth;let lw=46,lh=lw*r;if(lh>16){lh=16;lw=lh/r}doc.addImage(lg,/^data:image\/png/.test(lg)?"PNG":"JPEG",M,y-2,lw,lh);lx=M+lw+5}catch(_){T("SNETAA-FO",M,y+5,{b:1,s:10,c:acc})}}
    T("SNETAA-FO Orléans-Tours",lx,y+17.5,{s:7.5,c:mute});
    T("FICHE DE REMBOURSEMENT",lx,y+6,{b:1,s:15});T("DE FRAIS",lx,y+12.5,{b:1,s:15});
    T("Remboursement total",W-M,y+5,{s:8,c:mute,a:"right"});T(eurPdf(c.total),W-M,y+13,{b:1,s:17,c:acc,a:"right"});
    y+=20;doc.setDrawColor(...line);doc.line(M,y,W-M,y);y+=6;
    const kv=(k,v,x,yy)=>{T(k,x,yy,{s:7.5,c:mute});T(v||"—",x,yy+4.5,{b:1,s:10})};
    kv("NOM",(p.nom||"").toUpperCase(),M,y);kv("Prénom",p.prenom,M+48,y);kv("Fonction",p.fonction,M+96,y);kv("Date de déclaration",fdate(f.dateDecl),M+150,y);
    y+=12;kv("Période",periode(f)||f.titre,M,y);kv("Barème",bareTxtCourt(bareme(f.deps.length?sortedDeps(f)[0].date:f.dateDecl)),M+48,y);kv("Justificatifs joints",String(list.length),M+150,y);
    if(f.statut!=="brouillon"){y+=11;kv("Statut",STATUTS[f.statut][0]+(f.envoyeLe?" · envoyée le "+fdate(f.envoyeLe):"")+(f.payeeLe?" · payée le "+fdate(f.payeeLe):""),M,y)}
    y+=13;
    // Tableau déplacements
    T("DÉPLACEMENTS",M,y,{b:1,s:9,c:acc});y+=3;
    const cols=[["N°",9],["Date",17],["Motif",34],["Trajet",44],["Km",10,"r"],["Indemn.",17,"r"],["Péages",15,"r"],["Parking",15,"r"],["Repas",13,"r"],["Total",16,"r"]];
    const xs=[];let xx=M;cols.forEach(cl=>{xs.push(xx);xx+=cl[1]});
    const head=()=>{doc.setFillColor(236,238,242);doc.rect(M,y,W-2*M,6.5,"F");cols.forEach((cl,i)=>T(cl[0],cl[2]?xs[i]+cl[1]-1.5:xs[i]+1.5,y+4.4,{b:1,s:7.5,c:mute,a:cl[2]?"right":undefined}));y+=6.5};
    head();
    sortedDeps(f).forEach((d,i)=>{const dc=depCalc(d,f);
      doc.setFont("helvetica","normal");doc.setFontSize(8);
      const mot=doc.splitTextToSize(motifTxt(d)||"—",cols[2][1]-3),tr=doc.splitTextToSize(trajetTxt(d)||"—",cols[3][1]-3);
      const js=f.pieces.filter(x=>x.depId===d.id).map(x=>ref[x.id]).join(" ");
      const lines=Math.max(mot.length,tr.length,1)+(js?1:0);const hRow=3.8*lines+3;
      if(y+hRow>270){doc.addPage();y=M;head()}
      const vals=[`D${i+1}`,fdate(d.date),mot,tr,String(Math.round(dc.km*10)/10),eurPdf(dc.ik),eurPdf(dc.peages),eurPdf(dc.parking),dc.repas?eurPdf(dc.repas):"—",eurPdf(dc.total)];
      vals.forEach((v,k)=>{const cl=cols[k];doc.setFont("helvetica",k===9?"bold":"normal");doc.setFontSize(8);doc.setTextColor(...ink);doc.text(v,cl[2]?xs[k]+cl[1]-1.5:xs[k]+1.5,y+4.2,cl[2]?{align:"right"}:undefined)});
      if(js){doc.setFontSize(7);doc.setTextColor(...acc);doc.text("Justif. "+js,xs[2]+1.5,y+4.2+3.8*Math.max(mot.length,tr.length))}
      y+=hRow;doc.setDrawColor(...line);doc.line(M,y,W-M,y)});
    if(!f.deps.length){T("Aucun déplacement",M+2,y+5,{s:8,c:mute});y+=8}
    // Autres
    y+=7;if(y>250){doc.addPage();y=M}
    T("AUTRES FRAIS",M,y,{b:1,s:9,c:acc});y+=2;
    [["Frais d'envois postaux",f.autres.postal],["Internet / Téléphonie",f.autres.internet],["Divers"+(f.autres.diversTxt?" : "+f.autres.diversTxt:""),f.autres.divers]].forEach(([k,v])=>{y+=5.5;T(k,M+1.5,y,{s:8.5});T(eurPdf(n(v)),W-M-1.5,y,{s:8.5,a:"right"});doc.setDrawColor(...line);doc.line(M,y+1.8,W-M,y+1.8)});
    const ja=f.pieces.filter(x=>x.depId==="autres").map(x=>ref[x.id]).join(" ");if(ja){y+=5;T("Justif. "+ja,M+1.5,y,{s:7,c:acc})}
    // Totaux
    y+=9;if(y>235){doc.addPage();y=M}
    const tot=[["Indemnités kilométriques ("+(Math.round(c.km*10)/10)+" km)",c.ik],["Péages",c.peages],["Parking",c.parking],["Repas (plafonnés)",c.repas],["Autres frais",c.autres]];
    tot.forEach(([k,v])=>{T(k,W-M-60,y,{s:8.5,c:mute});T(eurPdf(v),W-M-1.5,y,{s:8.5,a:"right"});y+=5});
    doc.setFillColor(227,234,248);doc.rect(W-M-64,y-3.5,64,9,"F");T("TOTAL À REMBOURSER",W-M-62,y+2.4,{b:1,s:9});T(eurPdf(c.total),W-M-1.5,y+2.4,{b:1,s:11,c:acc,a:"right"});
    // Signature
    let sy=y-28;T("Signature",M,sy,{s:7.5,c:mute});doc.setDrawColor(...line);doc.rect(M,sy+2,70,26);
    if(sig){try{doc.addImage(sig,"PNG",M+2,sy+3,66,22)}catch(_){}}
    T(`Je certifie l'exactitude des frais déclarés. ${nm}, le ${fdate(f.dateDecl)}`,M,sy+33,{s:7,c:mute});
    // Justificatifs
    const groups=[];sortedDeps(f).forEach((d,i)=>{const ps=list.filter(x=>x.depId===d.id);if(ps.length)groups.push([`D${i+1} · ${fdate(d.date)} · ${motifTxt(d)}${trajetTxt(d)?" · "+trajetTxt(d):""}`,ps,eurPdf(depCalc(d,f).total)])});
    const au=list.filter(x=>x.depId==="autres");if(au.length)groups.push(["Autres frais",au,eurPdf(c.autres)]);
    const un=list.filter(x=>!isAssigned(x,f));if(un.length)groups.push(["Justificatifs non affectés",un,""]);
    let done=0;
    for(const [title,ps,tt] of groups){
      doc.addPage();y=M;T("PIÈCES JUSTIFICATIVES",M,y+4,{b:1,s:8,c:acc});y+=10;
      const tl=doc.splitTextToSize(title,W-2*M-30);T(tl,M,y,{b:1,s:11});if(tt)T(tt,W-M,y,{b:1,s:11,a:"right"});y+=5*tl.length+2;doc.setDrawColor(...line);doc.line(M,y,W-M,y);y+=4;
      // pièces : documents pleine largeur, tickets en 2 colonnes
      let col=0,rowH=0;const colW=(W-2*M-6)/2;
      for(const pc of ps){
        msg.textContent=`Ajout des justificatifs… ${++done}/${list.length}`;
        const pages=pc.isDoc&&pc.pages&&pc.pages.length?pc.pages:[pc.imgId];
        const cap=[`${ref[pc.id]} · ${TYPES[pc.type]}`,[pc.date?fdate(pc.date):"",pc.heure?pc.heure.replace(":","h"):""].filter(Boolean).join(" à "),pc.montant!==""&&pc.montant!=null?eurPdf(pc.montant):""].filter(Boolean).join("   ·   ");
        const sub=pc.resume||pc.emetteur||"";
        for(let pi=0;pi<pages.length;pi++){
          let im;try{im=await imgForPdf(pages[pi])}catch(_){im=null}
          if(!im){if(col===1){y+=rowH+6;col=0;rowH=0}if(y+20>284){doc.addPage();y=M}doc.setDrawColor(...line);doc.rect(M,y,W-2*M,16);T(cap,M+3,y+6,{b:1,s:8.5});T("Photo conservée sur l'appareil du déclarant : voir le PDF joint à son mail.",M+3,y+11,{s:7.5,c:mute});y+=21;continue}
          const ratio=im.h/im.w;
          const wide=pc.isDoc||ratio<0.75;
          if(wide){ if(col===1){y+=rowH+6;col=0;rowH=0}
            let w=W-2*M,h=w*ratio;const maxH=290-y-26;if(h>maxH&&maxH<90){doc.addPage();y=M}const avail=290-y-24;if(h>avail){h=avail;w=h/ratio}
            doc.setDrawColor(...line);doc.rect(M,y,W-2*M,h+15);T(cap+(pages.length>1?`   ·   page ${pi+1}/${pages.length}`:""),M+3,y+5,{b:1,s:8.5});if(sub)T(doc.splitTextToSize(sub,W-2*M-6)[0],M+3,y+9.5,{s:7.5,c:mute});
            doc.addImage(im.url,"JPEG",M+(W-2*M-w)/2,y+12,w,h);y+=h+21;
          }else{
            let w=colW-4,h=w*ratio;if(h>150){h=150;w=h/ratio}
            const boxH=h+17;if(col===0&&y+boxH>284){doc.addPage();y=M}
            if(col===1&&y+boxH>284){doc.addPage();y=M;col=0;rowH=0}
            const x0=M+col*(colW+6);doc.setDrawColor(...line);doc.rect(x0,y,colW,boxH);
            T(cap,x0+2.5,y+5,{b:1,s:8});if(sub)T(doc.splitTextToSize(sub,colW-5)[0],x0+2.5,y+9.3,{s:7,c:mute});
            doc.addImage(im.url,"JPEG",x0+(colW-w)/2,y+13,w,h);
            rowH=Math.max(rowH,boxH);if(col===1){y+=rowH+6;col=0;rowH=0}else col=1;
          }
        }
      }
    }
    footer();
    msg.textContent="Génération du fichier…";
    const blob=doc.output("blob");
    const fn=`Frais ${f.titre} - ${[p.nom,p.prenom].filter(Boolean).join(" ")||"declaration"}.pdf`.replace(/[\\/:*?"<>|]/g,"-");
    if(how==="blob")return blob;
    let ok;
    if(how==="share"&&canShareFiles()){try{await navigator.share({files:[new File([blob],fn,{type:"application/pdf"})],title:fn,text:mailText(f)});ok=true}catch(e){ok=false;if(e&&e.name!=="AbortError")toast("Partage impossible : télécharge le PDF")}}
    else ok=await saveFile(fn,blob);
    msg.textContent=ok?`PDF prêt (${(blob.size/1048576).toFixed(1)} Mo) : joins-le au mail.`:"";
  }catch(e){console.error(e);msg.textContent="Le PDF n'a pas pu être créé : "+(e&&e.message||"erreur")}
  finally{if(btn)btn.disabled=false}
}


/* ============ Reprise des anciennes déclarations (ancien onglet « Frais ») ============ */
function convertDep(f){ // fiches venues de la version autonome : repas oui/non → lignes de repas, trajets habituels
  f.deps.forEach(d=>{if(typeof d.repas==="boolean"){const r=d.repas;d.repas=[];if(r)d.repas.push({id:"r"+uid(),montant:10,manuel:true,papier:true})}
    if(!d.mode){d.mode="hab";d.retourHab=d.retour||"";d.retour=null}d.pts=d.pts||[];d.legs=d.legs||[];d.repas=d.repas||[]});
  f.hist=f.hist||[];if(!f.mois){const m=String(f.dateDecl||today()).slice(0,7);f.mois=m}if(!f.maj)f.maj=f.updatedAt||Date.now();
}
function migrer(){
  all();
  const R=D.roles||{};["s3","admin","tresorier"].forEach(k=>{if(R[k]&&Array.isArray(R[k].perms)&&!R[k].perms.includes("frais.regler")&&(k!=="tresorier"||R[k].perms.includes("frais.valider")))R[k].perms.push("frais.regler")});
  if(ME)Droits.rafraichir();
  const old=(D.frais||[]).filter(x=>x&&x.lignes&&!x._migre);if(!old.length)return;
  const MAP={brouillon:"brouillon",soumise:"envoyee",validee:"validee",payee:"payee",refusee:"corriger"};
  old.forEach(o=>{
    const mois=String(o.date||today()).slice(0,7);
    let f=all().find(x=>x.userId===o.userId&&x.mois===mois&&x._ancien&&x.statut===(MAP[o.statut]||"brouillon"));
    if(!f){const d=new Date(+mois.slice(0,4),+mois.slice(5,7)-1,1);const u=D.users.find(x=>x.id===o.userId)||{id:o.userId,nom:"",prenom:""};
      f={id:"f"+uid(),userId:o.userId,decl:ident(u),mois,titre:MOIS[d.getMonth()]+" "+d.getFullYear(),dateDecl:String(o.date||today()).slice(0,10),statut:MAP[o.statut]||"brouillon",envoyeLe:o.statut!=="brouillon"?String(o.date||"").slice(0,10):"",commentaire:"",payeeLe:o.statut==="payee"?String(((o.historique||[]).find(h=>h.a==="payee")||{}).d||"").slice(0,10):"",
        hist:(o.historique||[]).map(h=>({le:h.d,par:h.u,action:(MAP[h.a]||h.a)})),deps:[],autres:{postal:0,internet:0,divers:0,diversTxt:""},pieces:[],createdAt:Date.now(),maj:Date.now(),_ancien:1,ecritureId:o.ecritureId||""};all().push(f)}
    const d=newDep(String(o.date||"").slice(0,10));d.mode="hab";d.motif="Autre";d.motifAutre=o.objet||"Déplacement";d.reunionId=o.reunionId||"";d.auto=false;
    const km=(o.lignes||[]).filter(l=>l.type==="km");
    if(km.length){d.aller=km.map(l=>[l.depart,l.arrivee].filter(Boolean).join(" → ")).join(" ; ");d.allerKm=km.reduce((a,l)=>a+n(l.km),0);d.retourHab=km.some(l=>l.ar)?d.aller:"";d.retourKm=km.reduce((a,l)=>a+(l.ar?n(l.km):0),0)}
    (o.lignes||[]).forEach(l=>{const m=n(l.montant);if(l.type==="peage")d.peageA=r2(n(d.peageA)+m);else if(l.type==="parking")d.parkA=r2(n(d.parkA)+m);else if(l.type==="repas")d.repas.push({id:"r"+uid(),montant:m,manuel:true,papier:true});
      else if(l.type!=="km"){f.autres.divers=r2(n(f.autres.divers)+m);f.autres.diversTxt=[f.autres.diversTxt,l.libelle||l.type].filter(Boolean).join(", ")}});
    f.deps.push(d);
    (o.justifs||[]).forEach(async (j,k)=>{try{const url=typeof j==="string"?j:(j.data||j.url);if(!/^data:image/.test(url||""))return;const b=await (await fetch(url)).blob();await Store.init();const id=await Store.putImage(b);
      f.pieces.push(Object.assign(mkPiece({type:"autre",date:d.date,resume:"Justificatif repris de l'ancien onglet"},id,FULL.map(p=>p.slice()),id,{enhance:false}),{depId:d.id,needsCheck:false}));touch(f)}catch(_){}});
    o._migre=1;
  });
  D.fraisAncien=(D.fraisAncien||[]).concat(old);D.frais=(D.frais||[]).filter(x=>!x._migre);touch(null);
  log("Frais : reprise des anciennes déclarations",old.length+" déclaration(s)");
}

/* ============ Circuit d'équipe (Dropbox chiffré) : règles d'accès appliquées aux données ============ */
/* Ce qu'un membre reçoit : ses fiches ; avec le droit « voir et traiter », les fiches envoyées des autres (jamais les brouillons). */
function pourMembre(u,perms){
  const voit=perms&&(perms.has?perms.has("frais.valider"):perms.includes("frais.valider"));
  return all().filter(f=>f.userId===u.id||(voit&&f.statut!=="brouillon")).map(f=>{const c=clone(f);if(c.userId!==u.id)delete c._ancien;return c});
}
/* Ce qu'un membre renvoie : ses fiches modifiées, et (s'il traite) les décisions prises sur celles des autres. */
function pourRetour(depuis){
  const t=depuis?new Date(depuis).getTime():0;
  return{fiches:mine().filter(f=>(f.maj||0)>t).map(clone),traitees:can("frais.valider")?all().filter(f=>f.userId!==ME.id&&(f.traiteLe||0)>t).map(f=>({id:f.id,statut:f.statut,commentaire:f.commentaire,payeeLe:f.payeeLe,hist:f.hist,traiteLe:f.traiteLe,traitePar:f.traitePar})):[],profil:clone(prof()),supprimees:(D.fraisSupprimees||[]).slice()};
}
/* Côté référence (administrateur) : on n'accepte que ce que le membre a le droit de faire. */
function appliquerRetour(r,u,perms){
  if(!r)return 0;let nb=0;const peutTraiter=perms&&(perms.has?perms.has("frais.valider"):perms.includes("frais.valider"));
  (r.fiches||[]).forEach(f=>{if(f.userId!==u.id)return; // jamais la fiche d'un autre
    const ex=get(f.id);
    if(ex&&ex.userId!==u.id)return;
    if(ex&&["validee","payee"].includes(ex.statut)){return} // décision de la trésorerie : le déclarant ne peut plus la modifier
    if(ex&&(ex.maj||0)>=(f.maj||0))return;
    if(["validee","payee"].includes(f.statut))f.statut=ex?ex.statut:"envoyee"; // un déclarant ne valide pas sa propre fiche
    if(ex){f.commentaire=ex.commentaire;f.traiteLe=ex.traiteLe;f.traitePar=ex.traitePar;D.fraisFiches=all().filter(x=>x.id!==f.id)}
    all().push(f);nb++});
  (r.supprimees||[]).forEach(id=>{const ex=get(id);if(ex&&ex.userId===u.id&&["brouillon","corriger","payee"].includes(ex.statut)){D.fraisFiches=all().filter(x=>x.id!==id);nb++}});
  if(peutTraiter)(r.traitees||[]).forEach(t=>{const ex=get(t.id);if(!ex||ex.userId===u.id||ex.statut==="brouillon"||(ex.traiteLe||0)>=(t.traiteLe||0))return;
    if(!["envoyee","validee","corriger","payee"].includes(t.statut))return;Object.assign(ex,{statut:t.statut,commentaire:t.commentaire||"",payeeLe:t.payeeLe||"",hist:t.hist||ex.hist,traiteLe:t.traiteLe,traitePar:u.id});nb++});
  if(r.profil){u.frais=Object.assign(u.frais||{},r.profil)}
  return nb;
}
/* Côté membre : intégrer la mise à jour reçue sans perdre ses modifications locales plus récentes. */
function integrer(recues){
  if(!Array.isArray(recues))return;
  recues.forEach(f=>{const ex=get(f.id);
    if(!ex){all().push(f);return}
    if((f.maj||0)>(ex.maj||0)){D.fraisFiches=all().filter(x=>x.id!==f.id);all().push(f);return}
    if((f.traiteLe||0)>(ex.traiteLe||0))Object.assign(ex,{statut:f.statut,commentaire:f.commentaire,payeeLe:f.payeeLe,hist:f.hist,traiteLe:f.traiteLe,traitePar:f.traitePar});
  });
}
function aTraiter(){return can("frais.valider")?all().filter(f=>f.statut==="envoyee"&&f.userId!==ME.id).length:0}

function depuisCarte(a,b){ // a,b : UAI (a vide = domicile)
  const d=new Date(),m=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");const f=ficheMois(m,true);
  const dep=newDep(today());dep.pts=[a?{k:"etab",ref:a}:{k:"dom"},b?{k:"etab",ref:b}:{k:"dom"}];dep.retour=dep.pts[0];
  const e=etabDe(b);dep.motif="Autre";dep.motifAutre="Déplacement"+(e?" — "+e.nom:"");f.deps.push(dep);st.cur=f.id;st.tab="deps";rebuildLegs(dep);touch(f);App.go("frais");autoCalc(f,dep);
}
return{page,STATUTS,depuisCarte,depuisReunion:async rid=>{await depuisReunion(rid);App.go("frais")},depCalc,ficheCalc,bareme,mailText,pourMembre,pourRetour,appliquerRetour,integrer,aTraiter,migrer,
  _t:{st,conf,prof,newDep,newFiche,applyAuto,pieceOrder,parseText,detectPieces,ocrBest,warp,textAxis,ingest,makePdf,rebuildLegs,ptKey,distConnue,memoDist,cur,all,mine,checks,trajetTxt,makeSender,makeReceiver,buildBundle,unpackBundle,importBundle,getOcr,tresoriere,ident,envoyer,traiter,voirFiche,exportTous,touch,Store}};
})();
App.routes.frais = () => Frais.page();
