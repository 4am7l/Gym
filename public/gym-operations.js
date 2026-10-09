/* Member operations: safe client-side tools using existing API. */
(() => {
 'use strict';
 const escape = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const selected = new Set();
 const membersRoot=document.getElementById('all-members-list');
 if(!membersRoot)return;
 const bar=document.createElement('div');
 bar.className='gym-ops-bar';
 bar.innerHTML='<label><input type="checkbox" id="gym-select-all"> تحديد الظاهر</label><span id="gym-selected-count">0 محدد</span><button type="button" id="gym-bulk-delete" disabled>حذف المحددين</button><button type="button" id="gym-export-members">تصدير الأعضاء CSV</button><button type="button" id="gym-export-subs">تصدير الاشتراكات CSV</button>';
 membersRoot.before(bar);
 const search=document.createElement('div');
 search.className='gym-quick-search';
 search.innerHTML='<label for="gym-phone-search">بحث سريع برقم الهاتف</label><input id="gym-phone-search" type="tel" inputmode="tel" placeholder="أدخل رقم الهاتف"><div id="gym-phone-results" aria-live="polite"></div>';
 bar.before(search);
 const alertBox=document.createElement('div');
 alertBox.className='gym-expiry-alerts';
 const dash=document.getElementById('view-dashboard');
 if(dash)dash.prepend(alertBox);
 function csv(name,rows){
   const safe=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
   const content='\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\r\n');
   const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
 }
 const getMembers=()=>Array.isArray(globalMembers)?globalMembers:[];
 function updateSelection(){
   const visible=[...membersRoot.querySelectorAll('.gym-row-select')];
   document.getElementById('gym-selected-count').textContent=selected.size+' محدد';
   document.getElementById('gym-bulk-delete').disabled=!selected.size;
   const all=document.getElementById('gym-select-all');
   all.checked=visible.length>0&&visible.every(x=>x.checked);
   all.indeterminate=visible.some(x=>x.checked)&&!all.checked;
 }
 function enhanceRows(){
   const table=membersRoot.querySelector('.gym-table');
   if(!table)return;
   const head=table.querySelector('thead tr');
   if(head&&!head.querySelector('.gym-select-head'))head.insertAdjacentHTML('afterbegin','<th class="gym-select-head">تحديد</th>');
   table.querySelectorAll('tbody tr').forEach(tr=>{
     if(tr.querySelector('.gym-row-select'))return;
     const id=tr.querySelector('[data-member]')?.dataset.member;
     if(!id)return;
     const cell=document.createElement('td');
     cell.dataset.label='تحديد';
     cell.innerHTML='<input type="checkbox" class="gym-row-select" aria-label="تحديد المشترك">';
     const check=cell.querySelector('input');check.dataset.id=id;check.checked=selected.has(id);
     tr.prepend(cell);
   });
   updateSelection();
 }
 const observer=new MutationObserver(()=>{observer.disconnect();enhanceRows();observer.observe(membersRoot,{childList:true,subtree:true})});
 observer.observe(membersRoot,{childList:true,subtree:true});enhanceRows();
 membersRoot.addEventListener('change',e=>{if(!e.target.matches('.gym-row-select'))return;const id=e.target.dataset.id;e.target.checked?selected.add(id):selected.delete(id);updateSelection()});
 document.getElementById('gym-select-all').onchange=e=>{membersRoot.querySelectorAll('.gym-row-select').forEach(c=>{c.checked=e.target.checked;c.checked?selected.add(c.dataset.id):selected.delete(c.dataset.id)});updateSelection()};
 document.getElementById('gym-bulk-delete').onclick=async()=>{
   const ids=[...selected].filter(id=>getMembers().some(m=>String(m.id)===id));
   if(!ids.length)return;
   if(!await showCustomConfirm('حذف '+ids.length+' مشترك نهائيًا؟ لا يمكن التراجع عن الحذف.'))return;
   const btn=document.getElementById('gym-bulk-delete');btn.disabled=true;
   let done=0,failed=0;
   for(const id of ids){
     try{const r=await fetch('/api/members/'+encodeURIComponent(id),{method:'DELETE'});if(!r.ok)throw Error('HTTP '+r.status);selected.delete(id);done++}catch{failed++}
   }
   await loadAllData();updateSelection();
   if(window.gymToast)gymToast('تم حذف '+done+'، تعذر حذف '+failed,failed?'error':'success');
 };
 document.getElementById('gym-export-members').onclick=()=>csv('gym-members.csv',[['ID','الاسم','الهاتف','الرياضة','الحالة','تاريخ الانتهاء','الملاحظات'],...getMembers().map(m=>[m.id,m.full_name,m.phone,m.category,m.status,m.end_date,m.notes])]);
 document.getElementById('gym-export-subs').onclick=()=>csv('gym-current-subscriptions.csv',[['ID','المشترك','الخطة','السعر','البداية','النهاية','الحالة'],...getMembers().map(m=>[m.subscription_id,m.full_name,m.plan_name,m.subscription_price,m.start_date,m.end_date,m.status])]);
 const phoneInput=document.getElementById('gym-phone-search'),results=document.getElementById('gym-phone-results');
 phoneInput.addEventListener('input',()=>{
   const q=phoneInput.value.replace(/\D/g,'');results.replaceChildren();
   if(q.length<3)return;
   const found=getMembers().filter(m=>String(m.phone||'').replace(/\D/g,'').includes(q)).slice(0,8);
   if(!found.length){results.textContent='لا توجد نتائج';return}
   found.forEach(m=>{
     const line=document.createElement('div');line.className='gym-phone-result';
     line.innerHTML='<span><strong>'+escape(m.full_name)+'</strong><small>'+escape(m.phone)+' · '+escape(m.status||'بدون اشتراك')+'</small></span><button type="button">التفاصيل والتجديد</button>';
     line.querySelector('button').onclick=()=>window.gymOpenMember(m.id);
     results.append(line);
   });
 });
 function refreshAlerts(){
   const expiring=getMembers().filter(m=>m.status==='Expiring Soon');
   if(!dash)return;
   alertBox.innerHTML='<strong>تنبيهات انتهاء الاشتراكات ('+expiring.length+')</strong>';
   const items=document.createElement('div');items.className='gym-expiry-items';
   expiring.slice(0,10).forEach(m=>{
     const b=document.createElement('button');b.type='button';b.textContent=m.full_name+' — '+(m.end_date||'');b.onclick=()=>window.gymOpenMember(m.id);items.append(b);
   });
   if(!expiring.length)items.textContent='لا توجد اشتراكات قريبة الانتهاء';
   alertBox.append(items);
 }
 const previousLoad=window.loadMembers;
 if(typeof previousLoad==='function')window.loadMembers=async function(...args){const result=await previousLoad.apply(this,args);refreshAlerts();if(phoneInput.value)phoneInput.dispatchEvent(new Event('input'));return result};
 refreshAlerts();
})();
