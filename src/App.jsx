import React,{useEffect,useMemo,useState} from 'react';

const STORE='acl-foundboard-v3';
// Fictional campus locations for this standalone teaching demo.
// A found report can exist before the item has been received by staff.
const seed=[
 {id:'f1',title:'Black backpack',category:'accessories',status:'lost',location:'Library - second floor',description:'Black backpack with a small red keychain. Left near the study desks.',owner:'you',created:'Oct 23',emoji:'🎒'},
 {id:'f2',title:'Dark backpack',category:'accessories',status:'found',location:'Library - main stairwell',description:'Found a dark backpack with a small red keychain near the library stairs.',owner:'other',created:'Oct 24',emoji:'🎒',collectionPoint:'Campus Security Desk',handoverStatus:'received'},
 {id:'f3',title:'Student ID card',category:'documents',status:'found',location:'Near Gate 3',description:'A student card was turned in. No personal details are published.',owner:'other',created:'Oct 24',emoji:'🪪',collectionPoint:'Student Services Office',handoverStatus:'received'},
 {id:'f4',title:'Wireless earbuds',category:'electronics',status:'lost',location:'Main cafeteria',description:'White earbuds in a distinctive blue case. Lost on Monday.',owner:'other',created:'Oct 24',emoji:'🎧'},
 {id:'f5',title:'Earbuds in blue case',category:'electronics',status:'found',location:'Cafeteria entrance',description:'White earbuds in a blue charging case found near the coffee counter.',owner:'other',created:'Oct 25',emoji:'🎧',collectionPoint:'',handoverStatus:'reported'},
 {id:'f6',title:'Blue sports bottle',category:'other',status:'lost',location:'Sports Hall - lockers',description:'Tall blue metal water bottle, possibly left after practice.',owner:'other',created:'Oct 25',emoji:'🥤'},
 {id:'f7',title:'Metal water bottle',category:'other',status:'found',location:'Sports Hall - benches',description:'Blue reusable metal bottle found after a basketball session.',owner:'other',created:'Oct 25',emoji:'🥤',collectionPoint:'Campus Security Desk',handoverStatus:'received'},
 {id:'f8',title:'Engineering lab coat',category:'clothing',status:'claimed',location:'Building C',description:'Owner verified the item and collected it from the reception desk.',owner:'you',created:'Oct 22',emoji:'🥼',collectionPoint:'Library Reception',handoverStatus:'released'},
 {id:'f9',title:'Small notebook',category:'other',status:'lost',location:'C7 lecture room',description:'Brown cover with handwritten engineering notes.',owner:'other',created:'Oct 25',emoji:'📒'},
 {id:'f10',title:'Scientific calculator',category:'electronics',status:'lost',location:'B2 lecture hall',description:'Black scientific calculator with a protective cover.',owner:'other',created:'Oct 26',emoji:'🧮'},
 {id:'f11',title:'Calculator',category:'electronics',status:'found',location:'B2 study area',description:'Scientific calculator with a black cover, found on a desk.',owner:'you',created:'Oct 26',emoji:'🧮',collectionPoint:'Library Reception',handoverStatus:'received'},
 {id:'f12',title:'Canvas tote bag',category:'accessories',status:'lost',location:'Main campus bus stop',description:'Beige tote with green writing on one side.',owner:'other',created:'Oct 26',emoji:'👜'},
 {id:'f13',title:'USB flash drive',category:'electronics',status:'found',location:'Building A computer lab',description:'A small black flash drive was found beside a workstation.',owner:'other',created:'Oct 27',emoji:'💾',collectionPoint:'',handoverStatus:'reported'},
];
const categories=['all','electronics','clothing','documents','accessories','other'];
const statuses=['lost','found','claimed'];
// The designated (fictional) campus collection points used in the example records.
const COLLECTION_POINTS=['Campus Security Desk','Student Services Office','Library Reception'];
const clean={title:'',category:'',status:'',location:'',description:'',handedInAt:''};
function getSaved(){try{const s=JSON.parse(localStorage.getItem(STORE));return Array.isArray(s)?s:seed;}catch{return seed;}}
const cap=s=>s.charAt(0).toUpperCase()+s.slice(1);

// Returns one message per invalid field (same rules and wording as before) plus the
// conflicting report for the duplicate rule, so the form can point to it.
function validate(f,arr,id){
 const errors={};
 if(!f.title.trim()||f.title.trim().length<2)errors.title='Title must be at least 2 characters.';
 if(!statuses.includes(f.status))errors.status='Choose lost, found or claimed.';
 if(!categories.slice(1).includes(f.category))errors.category='Choose a category.';
 if(f.handedInAt&&!COLLECTION_POINTS.includes(f.handedInAt))errors.handedInAt='Choose one of the listed collection points.';
 const duplicate=errors.title?null:arr.find(r=>r.id!==id&&r.title.toLowerCase()===f.title.trim().toLowerCase()&&(r.location||'').toLowerCase()===(f.location||'').trim().toLowerCase())||null;
 if(duplicate)errors.title='An item with the same title has already been reported at this location.';
 return {errors,duplicate};
}
const FIELD_ORDER=['status','title','category','location','handedInAt','description'];

// --- Matching lost <-> found reports -------------------------------------
const STOP=new Set(['with','the','and','near','found','lost','left','after','possibly','one','side','from','for','was','has','been','its','into','this','that','turned','main','are','not']);
function keywords(x){
 const raw=`${x.title} ${x.description||''} ${x.location||''}`.toLowerCase().match(/[a-z0-9]+/g)||[];
 return new Set(raw.filter(w=>w.length>=3&&!STOP.has(w)).map(w=>w.length>4&&w.endsWith('s')?w.slice(0,-1):w));
}
// A possible match is a report of the opposite status (lost vs found), in the same
// category, sharing at least two descriptive words. Claimed items are excluded.
function findMatches(item,all){
 if(item.status==='claimed')return [];
 const target=item.status==='lost'?'found':'lost';
 const mine=keywords(item);
 return all.filter(o=>o.id!==item.id&&o.status===target&&o.category===item.category)
  .map(o=>({o,score:[...keywords(o)].filter(w=>mine.has(w)).length}))
  .filter(m=>m.score>=2).sort((a,b)=>b.score-a.score).map(m=>m.o);
}

// --- Where a found item physically is, and what the owner should do -------
function handover(item){
 if(item.status==='lost')return null;
 if(item.handoverStatus==='released')return {tone:'done',title:'Returned to its owner',text:'Ownership was verified and the item was collected.'};
 if(item.status==='claimed')return {tone:'done',title:'Marked as claimed',text:'The reporter says this item is back with its owner.'};
 if(item.handoverStatus==='received'&&item.collectionPoint)return {tone:'held',title:`Held at ${item.collectionPoint}`,text:'Staff release it after verifying ownership. Bring your student ID and a detail only the owner would know.'};
 if(item.handedInAt)return {tone:'pending',title:`Finder says it was handed in at ${item.handedInAt}`,text:'Awaiting staff confirmation. Check with that desk before you go.'};
 return {tone:'pending',title:'Not at a collection point yet',text:'Reported only. Staff do not have this item yet.'};
}

const COLUMNS=[{key:'lost',title:'LOST',sub:'Searching for these things',icon:'↗'},{key:'found',title:'FOUND',sub:'Looking for the owners',icon:'⌁'},{key:'claimed',title:'CLAIMED',sub:'Back where they belong',icon:'✓'}];
const STATUS_COPY={
 lost:{label:'I lost something',hint:'Post a notice so finders can recognise it.',location:'Where did you last have it?',details:'Colour, brand, stickers, contents: details that help someone recognise it.'},
 found:{label:'I found something',hint:'Help the owner get it back.',location:'Where did you find it?',details:'Describe it, but keep back one identifying detail (e.g. what is inside) so staff can verify the real owner.'},
 claimed:{label:'It is already back with its owner',hint:'Record an item that has been returned.',location:'Where was it found or lost?',details:'Any details worth keeping on record.'},
};

export default function App(){
 const [items,setItems]=useState(getSaved);
 const [page,setPage]=useState('board');
 const [q,setQ]=useState('');
 const [cat,setCat]=useState('all');
 const [filterStatus,setFilterStatus]=useState('all');
 const [matchFor,setMatchFor]=useState(null);
 const [current,setCurrent]=useState(null);
 const [form,setForm]=useState(clean);
 const [initialForm,setInitialForm]=useState(clean);
 const [errors,setErrors]=useState({});
 const [duplicate,setDuplicate]=useState(null);
 const [message,setMessage]=useState(null);
 useEffect(()=>localStorage.setItem(STORE,JSON.stringify(items)),[items]);

 const matchMap=useMemo(()=>new Map(items.map(x=>[x.id,findMatches(x,items)])),[items]);
 const tokens=q.toLowerCase().split(/\s+/).filter(Boolean);
 const filtered=useMemo(()=>{
  if(matchFor)return matchMap.get(matchFor)||[];
  return items.filter(x=>{
   const hay=`${x.title} ${x.location||''} ${x.description||''} ${x.category} ${x.collectionPoint||''} ${x.handedInAt||''}`.toLowerCase();
   return (cat==='all'||x.category===cat)&&(filterStatus==='all'||x.status===filterStatus)&&tokens.every(t=>hay.includes(t));
  });
 },[items,q,cat,filterStatus,matchFor,matchMap]);
 const matchSource=matchFor?items.find(x=>x.id===matchFor):null;
 const filtersActive=q.trim()!==''||cat!=='all'||filterStatus!=='all';
 const visibleColumns=matchSource?COLUMNS.filter(c=>c.key!==matchSource.status&&c.key!=='claimed'):filterStatus==='all'?COLUMNS:COLUMNS.filter(c=>c.key===filterStatus);
 const editingItem=current?items.find(x=>x.id===current):null;
 const staffConfirmed=editingItem&&(editingItem.handoverStatus==='received'||editingItem.handoverStatus==='released');
 const dirty=JSON.stringify(form)!==JSON.stringify(initialForm);

 function goBoard(){setPage('board');window.scrollTo(0,0);}
 function showView(status){setMatchFor(null);setFilterStatus(status);goBoard();}
 function clearFilters(){setQ('');setCat('all');setFilterStatus('all');setMatchFor(null);}
 function showMatches(id){clearFilters();setMatchFor(id);setMessage(null);goBoard();}
 function openForm(values,id){setCurrent(id);setForm(values);setInitialForm(values);setErrors({});setDuplicate(null);setPage('form');window.scrollTo(0,0);}
 function create(){openForm({...clean},null);}
 function edit(row){if(row.owner!=='you')return;openForm({title:row.title,category:row.category,status:row.status,location:row.location||'',description:row.description||'',handedInAt:row.handedInAt||''},row.id);}
 function leaveForm(){if(dirty&&!window.confirm('Discard your unsaved changes?'))return;setCurrent(null);goBoard();}
 function setField(name,value){
  setForm(s=>({...s,[name]:value}));
  setErrors(e=>{const n={...e};delete n[name];if(name==='location'&&duplicate)delete n.title;return n;});
  if(name==='title'||name==='location')setDuplicate(null);
 }
 function focusField(name){const el=document.getElementById(`field-${name}`);if(el){el.focus();el.scrollIntoView({block:'center'});}}

 function submit(e){
  e.preventDefault();
  const v=validate(form,items,current);
  setErrors(v.errors);setDuplicate(v.duplicate);
  const firstBad=FIELD_ORDER.find(f=>v.errors[f]);
  if(firstBad){focusField(firstBad);return;}
  let handedInAt='';
  if(form.status==='found')handedInAt=staffConfirmed?(editingItem.handedInAt||''):form.handedInAt;
  const d={...form,title:form.title.trim(),location:form.location.trim(),description:form.description.trim(),handedInAt,owner:'you',created:'Today',emoji:current?editingItem?.emoji:'📌',...(current?{}:{collectionPoint:'',handoverStatus:'reported'})};
  const id=current||`f-${Date.now()}`;
  const next=current?items.map(x=>x.id===current?{...x,...d}:x):[{id,...d},...items];
  setItems(next);
  const saved=next.find(x=>x.id===id);
  const matches=findMatches(saved,next);
  let text=current?'Report updated.':'Your report has been posted.';
  if(saved.status==='found'&&saved.handoverStatus==='reported'&&!saved.handedInAt)text+=' Please hand the item in at a collection point so the owner can recover it.';
  if(matches.length)text+=` ${matches.length} ${saved.status==='lost'?'found':'lost'} report${matches.length>1?'s':''} may match it.`;
  setMessage({text,matchFor:matches.length?id:null});
  clearFilters();setCurrent(null);goBoard();
 }
 function reset(){setItems(seed);clearFilters();goBoard();setMessage({text:'Example reports restored.'});}

 const fieldProps=name=>({id:`field-${name}`,'aria-invalid':errors[name]?'true':undefined,'aria-describedby':[`hint-${name}`,errors[name]?`err-${name}`:''].filter(Boolean).join(' ')});
 const FieldError=({name})=>errors[name]?<p className="field-error" id={`err-${name}`}>{errors[name]}</p>:null;
 const copy=STATUS_COPY[form.status];
 const errorList=FIELD_ORDER.filter(f=>errors[f]);

 const card=item=>{
  const h=handover(item);
  const matches=matchMap.get(item.id)||[];
  const mine=item.owner==='you';
  return <article className={'sticky'+(mine?' mine':'')} key={item.id}>
   <div className="sticky-top"><span>{item.category}</span>{mine&&<span className="mine-tag">Your report</span>}</div>
   <div className="sticky-emoji" aria-hidden="true">{item.emoji}</div>
   <h3>{item.title}</h3>
   <p>{item.description||'No additional description.'}</p>
   {h&&<div className={'handover-note '+h.tone}><strong>{h.title}</strong><span>{h.text}</span></div>}
   <div className="sticky-bottom"><span>⌖ {item.location||'Location not provided'}</span><small>{item.created}</small></div>
   {(mine||matches.length>0)&&<div className="card-actions">
    {matches.length>0&&<button className="match-link" onClick={()=>showMatches(item.id)}>{matches.length} possible {item.status==='lost'?'found':'lost'} match{matches.length>1?'es':''} →</button>}
    {mine&&<button className="edit-button" onClick={()=>edit(item)} aria-label={`Edit your report: ${item.title}`}>Edit</button>}
   </div>}
  </article>;
 };

 return <div className="notice-app"><header className="header"><div className="headline"><span className="sun" aria-hidden="true">✺</span><button onClick={()=>showView('all')} className="wordmark">FOUND<span>on campus</span></button><p>Community noticeboard</p></div>
  <nav className="header-links" aria-label="Board views">{[['all','Noticeboard'],['lost','Missing items'],['found','Recently found']].map(([k,label])=><button key={k} aria-current={page==='board'&&!matchFor&&filterStatus===k?'page':undefined} onClick={()=>showView(k)}>{label}</button>)}</nav>
  <button className="report-button" onClick={create}>+ Post a report</button></header>
  <div className="ruleline"><span>SEARCH • DISCOVER • REUNITE</span><span>Helping lost things find their way back.</span></div>
  {page==='board'?<main className="workspace"><aside className="filters"><p className="kicker">YOUR NOTICEBOARD</p><h1>Lost something?<br/><em>You're in the right place.</em></h1><p className="intro">Browse what the campus community has shared or post what you've lost or found.</p>
   <div className="filterbox" role="search"><h3>Browse reports</h3>
    <label>Search items<input type="search" value={q} onChange={e=>{setMatchFor(null);setQ(e.target.value)}} placeholder="e.g. blue earbuds" aria-describedby="search-hint"/></label>
    <p className="filter-hint" id="search-hint">Searches titles, descriptions, locations and collection points. Words can be in any order.</p>
    <label>Item category<select value={cat} onChange={e=>{setMatchFor(null);setCat(e.target.value)}}><option value="all">All categories</option>{categories.slice(1).map(c=><option key={c} value={c}>{cap(c)}</option>)}</select></label>
    <label>Report status<select value={filterStatus} onChange={e=>{setMatchFor(null);setFilterStatus(e.target.value)}}><option value="all">All statuses</option>{statuses.map(s=><option key={s} value={s}>{cap(s)}</option>)}</select></label>
    <div className="filter-result"><span aria-live="polite">Showing <b>{filtered.length}</b> of {items.length} reports</span><button onClick={clearFilters} disabled={!filtersActive&&!matchFor}>Clear filters</button></div>
   </div>
   <div className="side-message"><span aria-hidden="true">📍</span><strong>Found something?</strong><p>Post a notice, then hand the item in at a collection point: {COLLECTION_POINTS.join(', ')}. Owners collect it there after staff verify ownership.</p><button onClick={create}>Share your report →</button></div><button className="reset" onClick={reset}>Reset demo data</button></aside>
   <section className="board"><div className="board-top"><div><p className="kicker">CAMPUS COMMUNITY</p><h2>{matchSource?'Possible matches':'Latest notices'} <span>({filtered.length})</span></h2></div><span className="time-note">Updated today</span></div>
    {message&&<div className="message" role="status"><span>{message.text}{message.matchFor&&<> <button className="inline-link" onClick={()=>showMatches(message.matchFor)}>View possible matches</button></>}</span><button onClick={()=>setMessage(null)} aria-label="Dismiss message">✕</button></div>}
    {matchSource&&<div className="match-banner"><div><strong>{matchSource.status==='lost'?'Found':'Lost'} reports that may match “{matchSource.title}”</strong><span>Same category and similar description. Check the details before contacting a collection point.</span></div><button onClick={()=>setMatchFor(null)}>← All reports</button></div>}
    {filtered.length===0&&!matchSource?<div className="empty-state"><strong>No reports match {tokens.length?`“${q.trim()}”`:'these filters'}{cat!=='all'?` in ${cap(cat)}`:''}{filterStatus!=='all'?` (${filterStatus})`:''}.</strong><p>Try fewer words, another category, or all statuses. If you lost something, post a notice so finders can reach you.</p><div><button onClick={clearFilters}>Clear filters</button><button className="report-button" onClick={create}>+ Post a report</button></div></div>:
    <div className={'board-grid cols-'+visibleColumns.length}>{visibleColumns.map(col=>{const colItems=filtered.filter(r=>r.status===col.key);return <div className="board-column" key={col.key}><div className="column-head"><span className={'col-icon '+col.key} aria-hidden="true">{col.icon}</span><div><strong>{col.title}</strong><small>{col.sub}</small></div><span className="col-count">{colItems.length}</span></div><div className="sticky-list">{colItems.map(card)}{colItems.length===0&&<div className="empty-column">{filtersActive?`No ${col.key} reports match your filters`:'Nothing here yet'}</div>}</div></div>;})}</div>}
   </section></main>:
  <main className="report-page"><div className="crumbs"><button onClick={leaveForm}>← Noticeboard</button><span>/</span><span>{current?'Edit your report':'Report an item'}</span></div><div className="report-layout"><div className="report-intro"><span className="seal" aria-hidden="true">✺</span><p className="kicker">HELP THE COMMUNITY</p><h1>{current?'Update your report':'Tell us what happened.'}</h1><p>Small details can help someone recognize their belongings.</p>
   <div className="paper-note">Your report will appear on the public campus noticeboard with the details you provide.<br/><br/><strong>Found property</strong> is returned only at a designated collection point, after staff verify ownership.</div></div>
   <section className="form-paper"><header><p>{current?'EDIT NOTICE':'NEW NOTICE'} / FORM 01</p><h2>{current?'Edit report':'Report an item'}</h2><p className="required-note"><b>*</b> Required</p></header>
    <form onSubmit={submit} noValidate>
     <fieldset className={'status-choice'+(errors.status?' invalid':'')} aria-describedby={errors.status?'err-status':undefined}><legend>What happened? <b>*</b></legend>
      <div className="status-options">{statuses.map((s,i)=><label key={s} className={form.status===s?'selected':''}><input type="radio" name="status" value={s} id={i===0?'field-status':undefined} checked={form.status===s} onChange={()=>setField('status',s)}/><span className={'col-icon '+s} aria-hidden="true">{COLUMNS[i].icon}</span><span><strong>{STATUS_COPY[s].label}</strong><small>{STATUS_COPY[s].hint}</small></span></label>)}</div>
      <FieldError name="status"/></fieldset>
     <label><span className="label-text">Item title <b>*</b></span><input {...fieldProps('title')} value={form.title} onChange={e=>setField('title',e.target.value)} placeholder="e.g., Black backpack"/><span className="hint" id="hint-title">At least 2 characters. Name the item, not the place.</span><FieldError name="title"/>
      {duplicate&&<span className="dup-help">Is it the same item? <button type="button" className="inline-link" onClick={()=>{if(dirty&&!window.confirm('Leave this form? Your entries will be discarded.'))return;clearFilters();setQ(duplicate.title);setCurrent(null);goBoard();}}>View the existing “{duplicate.title}” report</button>, or change the title or location if it is a different item.</span>}</label>
     <label><span className="label-text">Category <b>*</b></span><select {...fieldProps('category')} value={form.category} onChange={e=>setField('category',e.target.value)}><option value="">Select item category</option>{categories.slice(1).map(s=><option key={s} value={s}>{cap(s)}</option>)}</select><span className="hint" id="hint-category">Used to match lost and found reports.</span><FieldError name="category"/></label>
     <label><span className="label-text">{copy?copy.location:'Location'} <span className="optional">(optional)</span></span><input {...fieldProps('location')} value={form.location} onChange={e=>setField('location',e.target.value)} placeholder="e.g., Library - second floor"/><span className="hint" id="hint-location">Be specific: building, floor or room.</span></label>
     {form.status==='found'&&(staffConfirmed?
      <div className="collection-box confirmed"><strong>{editingItem.handoverStatus==='released'?'Returned to its owner':`Staff confirmed: held at ${editingItem.collectionPoint}`}</strong><span>The handover status is managed by collection-point staff and is not changed by editing this report.</span></div>:
      <div className="collection-box"><strong>Hand it in at a collection point</strong><span>Owners recover found property only at a designated collection point, after staff verify ownership.</span>
       <label><span className="label-text">Where did you hand it in? <span className="optional">(optional)</span></span><select {...fieldProps('handedInAt')} value={form.handedInAt} onChange={e=>setField('handedInAt',e.target.value)}><option value="">Not handed in yet</option>{COLLECTION_POINTS.map(p=><option key={p} value={p}>{p}</option>)}</select><span className="hint" id="hint-handedInAt">Your notice will say “awaiting staff confirmation” until staff confirm they have it.</span><FieldError name="handedInAt"/></label></div>)}
     <label><span className="label-text">More details <span className="optional">(optional)</span></span><textarea {...fieldProps('description')} rows="5" value={form.description} onChange={e=>setField('description',e.target.value)} placeholder="Describe the item"/><span className="hint" id="hint-description">{copy?copy.details:'Choose what happened first for tips on what to include.'}</span></label>
     {errorList.length>0&&<div className="form-error" role="alert"><strong>{errorList.length===1?'1 thing needs fixing':`${errorList.length} things need fixing`} before you can publish:</strong><ul>{errorList.map(f=><li key={f}><button type="button" onClick={()=>focusField(f)}>{errors[f]}</button></li>)}</ul></div>}
     <div className="form-actions"><button type="button" onClick={leaveForm}>Cancel</button><button className="report-button" type="submit">{current?'Save report':'Publish notice'}</button></div>
    </form></section></div></main>}
  <footer className="pagefooter"><span>FOUND / Campus noticeboard</span><span>Community project • Demo only</span></footer>
 </div>;
}
