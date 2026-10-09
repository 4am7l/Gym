/* Progressive UI enhancements. Existing CRUD, authentication and API contracts remain in app.js. */
(() => {
  'use strict';
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    const fields = [['رقم الهاتف',m.phone],['الرياضة',m.category||'كمال أجسام'],['الحالة',statusText(m.status)],['تاريخ البداية',m.start_date],['تاريخ الانتهاء',m.end_date],['ملاحظات',m.notes]];
    drawer.innerHTML = '<div class="gym-drawer-head"><h2>'+escapeHTML(m.full_name)+'</h2><button type="button" class="gym-close" data-action="close" aria-label="إغلاق">✕</button></div><dl>'+fields.map(([k,v])=>'<dt>'+k+'</dt><dd>'+escapeHTML(v||'—')+'</dd>').join('')+'</dl><div class="gym-drawer-actions"><button type="button" data-action="edit">تعديل البيانات</button><button type="button" data-action="renew">تجديد الاشتراك</button></div>';
    drawer.querySelector('[data-action="close"]').onclick=close;
    drawer.querySelector('[data-action="edit"]').onclick=()=>{close();editMember(m.id)};
    drawer.querySelector('[data-action="renew"]').onclick=()=>{close();openRenewModal(m.id)};
    backdrop.classList.add('open');drawer.classList.add('open');document.body.style.overflow='hidden';drawer.focus();
  };
  renderMembers = function(members) {
    const filtered = (Array.isArray(members)?members:[]).filter(m=>statusFilter==='all'||m.status===statusFilter).slice();
    filtered.sort((a,b)=>sortBy==='name'?String(a.full_name||'').localeCompare(String(b.full_name||''),'ar'):sortBy==='expiry'?String(a.end_date||'9999').localeCompare(String(b.end_date||'9999')):Number(b.id)-Number(a.id));
    const count=document.getElementById('gym-count');if(count)count.textContent=filtered.length+' مشترك';
    list.classList.remove('items-grid');
    if(!filtered.length){list.innerHTML='<p style="padding:20px">لا يوجد مشتركون يطابقون البحث أو الفلاتر.</p>';return}
    list.innerHTML='<div class="gym-table-wrap"><table class="gym-table"><thead><tr><th>المشترك</th><th>الهاتف</th><th>الرياضة</th><th>الحالة</th><th>انتهاء الاشتراك</th><th>الإجراءات</th></tr></thead><tbody>'+filtered.map(m=>'<tr><td><button class="gym-link" data-member="'+escapeHTML(m.id)+'">'+escapeHTML(m.full_name)+'</button></td><td>'+escapeHTML(m.phone||'—')+'</td><td>'+escapeHTML(m.category||'كمال أجسام')+'</td><td><span class="gym-pill '+escapeHTML((m.status||'').replaceAll(' ','-'))+'">'+statusText(m.status)+'</span></td><td>'+escapeHTML(m.end_date||'—')+'</td><td><button class="gym-link" data-member="'+escapeHTML(m.id)+'">التفاصيل ←</button></td></tr>').join('')+'</tbody></table></div>';
  };
  list.addEventListener('click',e=>{const b=e.target.closest('[data-member]');if(b)window.gymOpenMember(b.dataset.member)});
  if(typeof filterMembers==='function')filterMembers();
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
