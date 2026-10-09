/* Member operations: safe client-side tools using existing API. */
(() => {
 'use strict';
 const escape = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const membersRoot=document.getElementById('all-members-list');
 if(!membersRoot)return;
 const alertBox=document.createElement('div');
 alertBox.className='gym-expiry-alerts';
 const dash=document.getElementById('view-dashboard');
 /* expiry alerts intentionally removed from dashboard */
 function csv(name,rows){
   const safe=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
   const content='\ufeff'+rows.map(r=>r.map(safe).join(',')).join('\r\n');
   const url=URL.createObjectURL(new Blob([content],{type:'text/csv;charset=utf-8'}));
   const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000);
 }
 const getMembers=()=>Array.isArray(globalMembers)?globalMembers:[];
 const selected = new Set();
 const bar=document.createElement('div');
 bar.className='gym-ops-bar';
 bar.innerHTML='<label><input type="checkbox" id="gym-select-all"> تحديد الكل (الظاهر)</label><span id="gym-selected-count">0 محدد</span><button type="button" id="gym-bulk-delete" disabled>حذف المحددين</button>';
 membersRoot.before(bar);
 const allCheck=bar.querySelector('#gym-select-all');
 const count=bar.querySelector('#gym-selected-count');
 const deleteBtn=bar.querySelector('#gym-bulk-delete');
 const visibleChecks=()=>[...membersRoot.querySelectorAll('.gym-row-select')];
 function syncSelection(){
   const checks=visibleChecks();
   checks.forEach(c=>{c.checked=selected.has(c.dataset.id)});
   allCheck.checked=checks.length>0&&checks.every(c=>c.checked);
   allCheck.indeterminate=checks.some(c=>c.checked)&&!allCheck.checked;
   count.textContent=selected.size+' محدد';
   deleteBtn.disabled=!selected.size;
 }
 const selectionObserver=new MutationObserver(()=>{selectionObserver.disconnect();syncSelection();selectionObserver.observe(membersRoot,{childList:true,subtree:true})});
 selectionObserver.observe(membersRoot,{childList:true,subtree:true});
 membersRoot.addEventListener('change',e=>{
   if(!e.target.matches('.gym-row-select'))return;
   const id=e.target.dataset.id;
   if(e.target.checked)selected.add(id);else selected.delete(id);
   syncSelection();
 });
 allCheck.addEventListener('change',()=>{
   visibleChecks().forEach(c=>{if(allCheck.checked)selected.add(c.dataset.id);else selected.delete(c.dataset.id)});
   syncSelection();
 });
 deleteBtn.addEventListener('click',async()=>{
   const ids=[...selected].filter(id=>getMembers().some(m=>String(m.id)===id));
   if(!ids.length)return;
   if(!await showCustomConfirm('هل تريد حذف '+ids.length+' مشترك نهائيًا؟ لا يمكن التراجع عن الحذف.'))return;
   deleteBtn.disabled=true;
   let deleted=0,failed=0;
   try {
     const res=await fetch('/api/members/bulk-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids:ids.map(Number)})});
     const result=await res.json();
     if(!res.ok)throw new Error(result.error||'تعذر الحذف');
     const removed=new Set((result.deletedIds||[]).map(String));
     for(const id of removed)selected.delete(id);
     deleted=removed.size;
     failed=ids.length-deleted;
   }catch(err){
     failed=ids.length;
     if(window.gymToast)window.gymToast('تعذر الحذف: '+err.message,'error');
   }
   await loadAllData();
   deleteBtn.disabled=false;
   syncSelection();
   if(window.gymToast)window.gymToast('تم حذف '+deleted+' مشترك، وفشل حذف '+failed,failed?'error':'success');
 });
 const exportRows=kind=>kind==='members'?[['ID','الاسم','الهاتف','الرياضة','الحالة','تاريخ الانتهاء','الملاحظات'],...getMembers().map(m=>[m.id,m.full_name,m.phone,m.category,m.status,m.end_date,m.notes])]:[['ID','المشترك','الخطة','السعر','البداية','النهاية','الحالة'],...getMembers().map(m=>[m.subscription_id,m.full_name,m.plan_name,m.subscription_price,m.start_date,m.end_date,m.status])];
 document.querySelectorAll('[data-gym-export]').forEach(button=>button.addEventListener('click',()=>{const [kind,format]=button.dataset.gymExport.split('-');const rows=exportRows(kind);if(format==='csv')return csv('gym-'+kind+'.csv',rows);const headers=rows[0];const data=rows.slice(1).map(row=>Object.fromEntries(headers.map((h,i)=>[h,row[i]??null])));const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='gym-'+kind+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}));
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
 if(typeof previousLoad==='function')window.loadMembers=async function(...args){const result=await previousLoad.apply(this,args);return result};
 /* no dashboard expiry alert */

 const operationsPanel=document.createElement('section');
 operationsPanel.className='gym-finance-panel';
 operationsPanel.hidden=true;
 operationsPanel.innerHTML='<div class="gym-finance-head"><strong id="gym-finance-title">عمليات المشترك</strong><button type="button" id="gym-finance-close">إغلاق</button></div><div id="gym-finance-body"></div>';
 document.body.append(operationsPanel);
 document.getElementById('gym-finance-close').onclick=()=>operationsPanel.hidden=true;
 async function openOperations(id){
   const m=getMembers().find(x=>String(x.id)===String(id));if(!m)return;
   operationsPanel.hidden=false;
   document.getElementById('gym-finance-title').textContent='الحضور والدفعات — '+m.full_name;
   const body=document.getElementById('gym-finance-body');body.textContent='جاري تحميل البيانات...';
   try{
     const response=await fetch('/api/ops/member/'+encodeURIComponent(id));
     const data=await response.json();if(!response.ok)throw Error(data.error||'فشل التحميل');
     const fmt=n=>Number(n||0).toFixed(2)+' د.أ';
     body.innerHTML='<div class="gym-finance-stats"><div>المطلوب: <b>'+fmt(data.financial.due)+'</b></div><div>المدفوع: <b>'+fmt(data.financial.paid)+'</b></div><div>المتبقي: <b>'+fmt(data.financial.balance)+'</b></div></div>'+
       (data.financial.estimated?'<p class="gym-finance-warning">المطلوب تقديري من الاشتراك الحالي؛ التجديدات القديمة غير محفوظة.</p>':'')+
       '<form id="gym-payment-form"><label>تسجيل دفعة جديدة (د.أ) <input name="amount" type="number" min="0.01" step="0.01" required></label><label>ملاحظة <input name="note" maxlength="500"></label><button>حفظ الدفعة</button></form>'+
       '<button type="button" id="gym-checkin">تسجيل حضور اليوم</button>'+
       '<h3>الدفعات</h3><div id="gym-payment-history"></div><h3>سجل التجديدات الجديدة</h3><div id="gym-renewal-history"></div><h3>الحضور الأخير</h3><div id="gym-attendance-history"></div>';
     const rows=(target,items,render)=>{const node=body.querySelector(target);if(!items.length){node.textContent='لا توجد سجلات بعد';return}items.forEach(item=>{const row=document.createElement('p');row.textContent=render(item);node.append(row)})};
     rows('#gym-payment-history',data.payments,p=>new Date(p.created_at).toLocaleString('ar-JO')+' — '+fmt(p.amount)+(p.note?' — '+p.note:''));
     rows('#gym-renewal-history',data.events,e=>(e.start_date||'')+' إلى '+(e.end_date||'')+' — '+fmt(e.price));
     rows('#gym-attendance-history',data.attendance,a=>new Date(a.checked_in_at).toLocaleString('ar-JO'));
     body.querySelector('#gym-payment-form').onsubmit=async e=>{
       e.preventDefault();const form=e.currentTarget,button=form.querySelector('button');button.disabled=true;
       try{const response=await fetch('/api/ops/member/'+encodeURIComponent(id)+'/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:form.elements.amount.value,note:form.elements.note.value})});const result=await response.json();if(!response.ok)throw Error(result.error);await openOperations(id)}catch(err){alert(err.message)}finally{button.disabled=false}
     };
     body.querySelector('#gym-checkin').onclick=async()=>{
       const response=await fetch('/api/ops/member/'+encodeURIComponent(id)+'/attendance',{method:'POST'});
       const result=await response.json();if(!response.ok){alert(result.error||'تعذر تسجيل الحضور');return}await openOperations(id);
     };
   }catch(err){body.textContent='تعذر تحميل السجلات: '+err.message}
 }
 // Add a direct finance and attendance action beside the existing member actions.
 membersRoot.addEventListener('click',event=>{
   const trigger=event.target.closest('[data-action-member="operations"]');
   if(trigger){event.preventDefault();openOperations(trigger.dataset.id)}
 });
 const addOperationsButtons=()=>{
   membersRoot.querySelectorAll('.gym-actions-menu').forEach(menu=>{
     if(menu.querySelector('[data-action-member="operations"]'))return;
     const existing=menu.querySelector('[data-action-member="details"]');
     if(!existing)return;
     const button=document.createElement('button');button.type='button';button.dataset.actionMember='operations';button.dataset.id=existing.dataset.id;button.textContent='الدفعات والحضور';menu.append(button);
   });
 };
 const actionObserver=new MutationObserver(()=>{actionObserver.disconnect();addOperationsButtons();actionObserver.observe(membersRoot,{childList:true,subtree:true})});
 actionObserver.observe(membersRoot,{childList:true,subtree:true});addOperationsButtons();
 if(dash){
   const auditButton=document.getElementById('gym-sidebar-audit');
   const auditAction=async()=>{
     operationsPanel.hidden=false;document.getElementById('gym-finance-title').textContent='سجل العمليات';
     const body=document.getElementById('gym-finance-body');body.textContent='جاري التحميل...';
     try{const r=await fetch('/api/ops/activity');const data=await r.json();if(!r.ok)throw Error(data.error);body.replaceChildren();if(!data.length)body.textContent='لا توجد عمليات مسجلة بعد';data.forEach(a=>{const p=document.createElement('p');p.textContent=new Date(a.created_at).toLocaleString('ar-JO')+' — '+a.action+' — '+(a.member_id??'');body.append(p)})}catch(err){body.textContent=err.message}
   };
   if(auditButton)auditButton.onclick=auditAction;
   const mobileAudit=document.getElementById('gym-mobile-audit');
   if(mobileAudit)mobileAudit.onclick=auditAction;
 }
 const mobileTools=document.getElementById('gym-mobile-tools');
 const mobileToggle=document.getElementById('gym-mobile-tools-toggle');
 const mobilePanel=document.getElementById('gym-mobile-tools-panel');
 if(mobileTools&&mobileToggle&&mobilePanel){
   const close=()=>{mobilePanel.hidden=true;mobileToggle.setAttribute('aria-expanded','false')};
   mobileToggle.onclick=e=>{e.stopPropagation();mobilePanel.hidden=!mobilePanel.hidden;mobileToggle.setAttribute('aria-expanded',String(!mobilePanel.hidden))};
   document.addEventListener('click',e=>{if(!mobileTools.contains(e.target))close()});
   document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
   mobilePanel.addEventListener('click',e=>{if(e.target.closest('button'))close()});
 }
})();
