/* Progressive UI enhancements. Existing CRUD, authentication and API contracts remain in app.js. */
(() => {
  'use strict';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const remainingText = endDate => {
    if (!endDate) return 'بدون اشتراك';
    const match = String(endDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return 'غير محدد';
    const endUTC = Date.UTC(+match[1], +match[2] - 1, +match[3]);
    const todayJordan = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Amman',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const parts = todayJordan.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!parts) return 'غير محدد';
    const todayUTC = Date.UTC(+parts[1], +parts[2] - 1, +parts[3]);
    const days = Math.round((endUTC - todayUTC) / 86400000);
    return days < 0 ? 'منتهي منذ ' + Math.abs(days) + ' يوم' : days === 0 ? 'ينتهي اليوم' : 'متبقي ' + days + ' يوم';
  };
  const statusText = s => s === 'Active' ? 'نشط' : s === 'Expiring Soon' ? 'قريب الانتهاء' : s === 'Expired' ? 'منتهي' : 'بدون اشتراك';
  let statusFilter = 'all', sortBy = 'newest';
  const toastStack = document.createElement('div');
  toastStack.className = 'gym-toast-stack';
  document.body.appendChild(toastStack);
  function toast(message, type='info') {
    const el = document.createElement('div');
    el.className = 'gym-toast ' + type;
    el.setAttribute('role','status');
    el.textContent = message;
    toastStack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }
  window.gymToast = toast;
  const list = document.getElementById('all-members-list');
  if (!list || typeof renderMembers !== 'function') return;
  const toolbar = document.createElement('div');
  toolbar.className = 'gym-toolbar';
  toolbar.innerHTML = '<label for="gym-status-filter">حالة الاشتراك</label><select id="gym-status-filter"><option value="all">كل الحالات</option><option value="Active">نشط</option><option value="Expiring Soon">قريب الانتهاء</option><option value="Expired">منتهي</option></select><label for="gym-sort">ترتيب</label><select id="gym-sort"><option value="newest">الأحدث</option><option value="name">الاسم</option><option value="expiry">تاريخ الانتهاء</option></select><span class="gym-count" id="gym-count"></span>';
  list.parentNode.insertBefore(toolbar,list);
  document.getElementById('gym-status-filter').addEventListener('change',e=>{statusFilter=e.target.value;filterMembers()});
  document.getElementById('gym-sort').addEventListener('change',e=>{sortBy=e.target.value;filterMembers()});
  const backdrop = document.createElement('div'), drawer = document.createElement('aside');
  backdrop.className = 'gym-drawer-backdrop';
  drawer.className = 'gym-drawer'; drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-label','تفاصيل المشترك');drawer.tabIndex=-1;
  document.body.append(backdrop,drawer);
  const close = () => {backdrop.classList.remove('open');drawer.classList.remove('open');document.body.style.removeProperty('overflow')};
  backdrop.addEventListener('click',close);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&drawer.classList.contains('open'))close()});
  window.gymOpenMember = id => {
    const m = globalMembers.find(x=>String(x.id)===String(id));
    if(!m)return;
    const fields = [['رقم الهاتف',m.phone],['الرياضة',m.category||'كمال أجسام'],['الحالة',statusText(m.status)],['تاريخ البداية',m.start_date],['تاريخ الانتهاء',m.end_date],['الأيام المتبقية',remainingText(m.end_date)],['ملاحظات',m.notes]];
    drawer.innerHTML = '<div class="gym-drawer-head"><h2>'+escapeHTML(m.full_name)+'</h2><button type="button" class="gym-close" data-action="close" aria-label="إغلاق">✕</button></div><dl>'+fields.map(([k,v])=>'<dt>'+k+'</dt><dd>'+escapeHTML(v||'—')+'</dd>').join('')+'</dl><div class="gym-drawer-actions"><button type="button" data-action="edit">تعديل البيانات</button><button type="button" data-action="renew">تجديد الاشتراك</button></div>';
    drawer.querySelector('[data-action="close"]').onclick=close;
    drawer.querySelector('[data-action="edit"]').onclick=()=>{close();editMember(m.id)};
    drawer.querySelector('[data-action="renew"]').onclick=()=>{close();openRenewModal(m.id)};
    backdrop.classList.add('open');drawer.classList.add('open');document.body.style.overflow='hidden';drawer.focus();
  };
  // Keep the original member cards (same layout as expiring/expired lists).
  const renderMemberCards = renderMembers;
  renderMembers = function(members) {
    const filtered = (Array.isArray(members)?members:[]).filter(m=>statusFilter==='all'||m.status===statusFilter).slice();
    filtered.sort((a,b)=>sortBy==='name'?String(a.full_name||'').localeCompare(String(b.full_name||''),'ar'):sortBy==='expiry'?String(a.end_date||'9999').localeCompare(String(b.end_date||'9999')):Number(b.id)-Number(a.id));
    const count=document.getElementById('gym-count');
    if(count)count.textContent=filtered.length+' مشترك';
    list.classList.add('items-grid');
    renderMemberCards(filtered);
  };
  list.addEventListener('click',e=>{
    const action=e.target.closest('[data-action-member]');
    if(action){
      const m=globalMembers.find(x=>String(x.id)===String(action.dataset.id));
      if(!m)return;
      const op=action.dataset.actionMember;
      if(op==='details')window.gymOpenMember(m.id);
      if(op==='edit')editMember(m.id);
      if(op==='renew')openRenewModal(m.id);
      if(op==='delete')deleteMember(m.id);
      action.closest('details')?.removeAttribute('open');
      return;
    }
    const b=e.target.closest('[data-member]');
    if(b)window.gymOpenMember(b.dataset.member);
  });
  document.addEventListener('click',e=>{
    if(!e.target.closest('.gym-actions'))document.querySelectorAll('.gym-actions[open]').forEach(el=>el.removeAttribute('open'));
  });
  if(typeof filterMembers==='function')filterMembers();

  // Avoid expensive glass-blur repaints while the virtual keyboard animates.
  let focusTimer;
  const isTextEntry = el => el && (el.matches('input:not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"]'));
  document.addEventListener('focusin', event => {
    if (!isTextEntry(event.target)) return;
    clearTimeout(focusTimer);
    document.documentElement.classList.add('gym-keyboard-open');
  });
  document.addEventListener('focusout', event => {
    if (!isTextEntry(event.target)) return;
    clearTimeout(focusTimer);
    focusTimer = setTimeout(() => {
      if (!isTextEntry(document.activeElement)) document.documentElement.classList.remove('gym-keyboard-open');
    }, 150);
  });
  // Non-invasive feedback: watch successful mutation requests without changing responses.
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async (...args)=>{
    const method=String(args[1]?.method||'GET').toUpperCase();
    const url=String(typeof args[0]==='string'?args[0]:args[0]?.url||'');
    const mutation=/^(POST|PUT|PATCH|DELETE)$/.test(method)&&url.startsWith('/api/');
    try {
      const res=await nativeFetch(...args);
      if(mutation)toast(res.ok?'تم تنفيذ العملية بنجاح':'تعذّر حفظ التغييرات، تحقق من البيانات',res.ok?'success':'error');
      return res;
    } catch(err) {
      if(url.startsWith('/api/'))toast('تعذّر الاتصال بالخادم. حاول مجددًا','error');
      throw err;
    }
  };
})();
