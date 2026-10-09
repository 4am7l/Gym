let globalMembers = [];
let globalPlans = [];
let globalRecentSubscriptions = [];
let currentSession = null;
let selectedCategoryFilter = 'الكل';
let globalWorkoutsData = null;

// ================= CUSTOM SYSTEM MODALS =================
function showCustomAlert(message, type = 'info') {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-alert-modal');
    const textElem = document.getElementById('alert-message-text');
    const iconElem = document.getElementById('alert-icon-wrapper');
    const confirmBtn = document.getElementById('alert-confirm-btn');
    const cancelBtn = document.getElementById('alert-cancel-btn');

    textElem.innerText = message || '';
    cancelBtn.style.display = 'none';

    if (type === 'error') {
      iconElem.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-red);"></i>';
    } else if (type === 'success') {
      iconElem.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--accent-green);"></i>';
    } else {
      iconElem.innerHTML = '<i class="fa-solid fa-circle-info" style="color:var(--accent-neon);"></i>';
    }

    modal.classList.add('active');

    confirmBtn.onclick = () => {
      modal.classList.remove('active');
      resolve(true);
    };
  });
}

function showCustomConfirm(message) {
  return new Promise((resolve) => {
    const modal = document.getElementById('custom-alert-modal');
    const textElem = document.getElementById('alert-message-text');
    const iconElem = document.getElementById('alert-icon-wrapper');
    const confirmBtn = document.getElementById('alert-confirm-btn');
    const cancelBtn = document.getElementById('alert-cancel-btn');

    textElem.innerText = message || '';
    iconElem.innerHTML = '<i class="fa-solid fa-circle-question" style="color:var(--accent-amber);"></i>';
    cancelBtn.style.display = 'block';
    modal.classList.add('active');

    confirmBtn.onclick = () => {
      modal.classList.remove('active');
      resolve(true);
    };

    cancelBtn.onclick = () => {
      modal.classList.remove('active');
      resolve(false);
    };
  });
}

function togglePassVisibility(inputId, iconElem) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    iconElem.classList.replace('fa-eye', 'fa-eye-slash');
  } else {
    input.type = 'password';
    iconElem.classList.replace('fa-eye-slash', 'fa-eye');
  }
}

async function checkExistingSession() {
  const savedSession = localStorage.getItem('gym-user-session') || sessionStorage.getItem('gym-user-session');
  if (savedSession) {
    try {
      currentSession = JSON.parse(savedSession);
      if(currentSession.role==='admin'){
        const response=await fetch('/api/admin/session');
        const state=await response.json();
        if(!state.admin){localStorage.removeItem('gym-user-session');sessionStorage.removeItem('gym-user-session');currentSession=null;}
      }
      if(currentSession){renderAppForRole();return;}
    }catch{currentSession=null;}
  } else {
    document.getElementById('login-portal').classList.remove('hidden');
    document.getElementById('app-view').classList.add('hidden');
  }
}

function switchLoginType(type) {
  const buttons = document.querySelectorAll('.login-tab-btn');
  buttons[0].classList.toggle('active', type === 'member');
  buttons[1].classList.toggle('active', type === 'admin');

  const memForm = document.getElementById('member-login-form');
  const admForm = document.getElementById('admin-login-form');

  memForm.style.display = type === 'member' ? 'flex' : 'none';
  admForm.style.display = type === 'admin' ? 'flex' : 'none';
}

async function handleMemberLogin(e) {
  e.preventDefault();
  const phoneInput = document.getElementById('login-phone').value.trim();
  const remember = document.getElementById('remember-member').checked;

  if (!phoneInput) return;

  try {
    const res = await fetch('/api/members');
    const members = await res.json();
    const found = members.find(m => String(m.phone).trim() === String(phoneInput).trim());

    if (!found) {
      await showCustomAlert('رقم الهاتف هذا غير مسجل في النظام. الرجاء مراجعة الكابتن لإضافتك.', 'error');
      return;
    }

    currentSession = { role: 'member', phone: phoneInput };
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('gym-user-session', JSON.stringify(currentSession));
    renderAppForRole();
  } catch (e) {
    await showCustomAlert('حدث خطأ أثناء الاتصال بالسيرفر', 'error');
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const pass = document.getElementById('login-passcode').value.trim();
  const remember = document.getElementById('remember-admin').checked;

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode: pass })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      currentSession = { role: 'admin' };
      const storage = remember ? localStorage : sessionStorage;
      storage.setItem('gym-user-session', JSON.stringify(currentSession));
      renderAppForRole();
    } else {
      await showCustomAlert(data.error || 'الرمز السري غير صحيح!', 'error');
    }
  } catch (err) {
    await showCustomAlert('حدث خطأ أثناء الاتصال بالسيرفر', 'error');
  }
}

function handleLogout() {
  fetch('/api/admin/logout',{method:'POST'}).catch(()=>{});
  localStorage.removeItem('gym-user-session');
  sessionStorage.removeItem('gym-user-session');
  currentSession = null;
  document.body.classList.remove('is-admin');

  const appView = document.getElementById('app-view');
  const loginPortal = document.getElementById('login-portal');

  appView.classList.add('hidden');
  setTimeout(() => {
    appView.style.display = 'none';
    loginPortal.style.display = 'flex';
    loginPortal.classList.remove('hidden');
  }, 250);
}

function renderAppForRole() {
  const loginPortal = document.getElementById('login-portal');
  const appView = document.getElementById('app-view');
  const adminPortal = document.getElementById('admin-portal-view');

  loginPortal.classList.add('hidden');
  setTimeout(() => {
    loginPortal.style.display = 'none';
    appView.style.display = 'flex';
    appView.classList.remove('hidden');

    if (currentSession.role === 'admin') {
      document.body.classList.add('is-admin');
      document.getElementById('role-subtitle').innerText = 'لوحة التحكم - الكابتن';
      document.getElementById('admin-add-btn').style.display = 'flex';
      
      adminPortal.style.display = 'grid';
      document.getElementById('member-portal-view').style.display = 'none';
      document.getElementById('member-portal-view').classList.remove('active');
      loadAllData();
    } else {
      document.body.classList.remove('is-admin');
      document.getElementById('role-subtitle').innerText = 'بوابة المشتركين';
      document.getElementById('admin-add-btn').style.display = 'none';
      
      adminPortal.style.setProperty('display', 'none', 'important');
      const memView = document.getElementById('member-portal-view');
      memView.style.display = 'block';
      memView.classList.add('active');
      loadMemberPersonalCard(currentSession.phone);
    }
  }, 250);
}

// إظهار/إخفاء حقل تحديد شهر التمرين بناءً على نوع الرياضة
function toggleWorkoutMonthField(catValue) {
  const group = document.getElementById('workout-month-select-group');
  if (group) {
    group.style.display = (catValue === 'كمال أجسام') ? 'flex' : 'none';
  }
}

async function loadMemberPersonalCard(phone) {
  try {
    const res = await fetch('/api/members');
    const members = await res.json();
    const m = members.find(x => String(x.phone).trim() === String(phone).trim());
    const container = document.getElementById('member-personal-card');

    if (!m) {
      container.innerHTML = '<div style="color:var(--accent-red); padding:10px;">تعذر العثور على بيانات اشتراكك. الرجاء التأكد من رقم الهاتف.</div>';
      return;
    }

    const daysLeft = getRemainingDays(m.end_date);
    let daysDisplay = 'غير محدد';
    if (daysLeft !== null) {
      if (daysLeft < 0) daysDisplay = `منتهي منذ ${Math.abs(daysLeft)} يوم`;
      else if (daysLeft === 0) daysDisplay = 'ينتهي اليوم!';
      else daysDisplay = `متبقي ${daysLeft} يوم`;
    }

    const statusClass = m.status === 'Active' ? 'Active' : (m.status === 'Expiring Soon' ? 'Expiring' : (m.status === 'Expired' ? 'Expired' : 'NoSub'));
    const statusText = m.status === 'Active' ? 'نشط' : (m.status === 'Expiring Soon' ? 'تنتهي قريباً' : (m.status === 'Expired' ? 'منتهي' : 'بدون اشتراك'));

    // استخراج شهر التمارين من حقل الملاحظات إذا كان مخصصاً
    let memberWorkoutMonth = 1;
    if (m.notes && m.notes.includes('[شهر:')) {
      const mMatch = m.notes.match(/\[شهر:\s*(\d+)\]/);
      if (mMatch) memberWorkoutMonth = parseInt(mMatch[1]);
    }

    container.innerHTML = `
      <div class="item-card-glass" style="max-width: 480px;">
        <div class="card-header-flex">
          <div>
            <div class="item-name" style="font-size: 1.1rem;">${m.full_name || 'مشترك'}</div>
            <div class="item-meta"><i class="fa-solid fa-phone"></i> ${m.phone || ''}</div>
          </div>
          <span class="badge-curved ${statusClass}">${statusText}</span>
        </div>

        <div class="details-box-inner" style="gap: 8px; padding: 12px;">
          <div class="info-row"><span class="info-lbl">السجل / الرياضة:</span><span class="info-val" style="color:var(--accent-amber);">${m.category || 'كمال أجسام'}</span></div>
          ${(m.category || 'كمال أجسام') === 'كمال أجسام' ? `<div class="info-row"><span class="info-lbl">شهر التمرين المعتمد:</span><span class="info-val" style="color:var(--accent-neon);">الشهر ${memberWorkoutMonth}</span></div>` : ''}
          <div class="info-row"><span class="info-lbl">الخطة المسجلة:</span><span class="info-val" style="color:var(--accent-neon);">${m.plan_name || 'لا يوجد'}</span></div>
          <div class="info-row"><span class="info-lbl">تاريخ بدء الاشتراك:</span><span class="info-val">${m.start_date || 'غير محدد'}</span></div>
          <div class="info-row"><span class="info-lbl">تاريخ انتهاء الاشتراك:</span><span class="info-val">${m.end_date || 'غير محدد'}</span></div>
          <div class="info-row"><span class="info-lbl">الأيام المتبقية:</span><span class="info-val" style="color:${daysLeft <= 5 ? (daysLeft < 0 ? 'var(--accent-red)' : 'var(--accent-amber)') : 'var(--accent-green)'};">${daysDisplay}</span></div>
        </div>
      </div>
    `;

    // إذا كان المشترك لكمال الأجسام، نعرض له قسم التمارين
    if ((m.category || 'كمال أجسام') === 'كمال أجسام') {
      document.getElementById('workout-plans-panel').style.display = 'block';
      await loadMemberWorkouts(memberWorkoutMonth);
    } else {
      document.getElementById('workout-plans-panel').style.display = 'none';
    }

  } catch (e) {
    console.error(e);
  }
}

async function loadMemberWorkouts(allowedMonth) {
  if (!globalWorkoutsData) {
    const res = await fetch('/api/workouts/bodybuilding');
    globalWorkoutsData = await res.json();
  }

  const tabsContainer = document.getElementById('workout-month-tabs');
  tabsContainer.innerHTML = '';

  for (let m = 1; m <= 3; m++) {
    const isUnlocked = m <= allowedMonth;
    const btn = document.createElement('button');
    btn.className = `category-filter-btn ${m === allowedMonth ? 'active' : ''}`;
    btn.style.opacity = isUnlocked ? '1' : '0.5';
    btn.style.cursor = isUnlocked ? 'pointer' : 'not-allowed';
    btn.innerHTML = `الشهر ${m} ${isUnlocked ? '' : '🔒'}`;

    if (isUnlocked) {
      btn.onclick = () => {
        document.querySelectorAll('#workout-month-tabs button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderWorkoutMonthExercises(m);
      };
    }
    tabsContainer.appendChild(btn);
  }

  renderWorkoutMonthExercises(allowedMonth);
}

function renderWorkoutMonthExercises(monthNum) {
  const container = document.getElementById('workout-exercises-container');
  container.innerHTML = '';

  const monthData = globalWorkoutsData[monthNum];
  if (!monthData) return;

  for (const [bodyPart, exercises] of Object.entries(monthData.exercises)) {
    let cardHtml = `
      <div class="item-card-glass">
        <div class="card-header-flex" style="border-bottom: 1px solid var(--border-glass); padding-bottom: 6px;">
          <div class="item-name" style="color: var(--accent-neon);"><i class="fa-solid fa-dumbbell"></i> عضلة ${bodyPart}</div>
        </div>
        <div class="details-box-inner" style="gap: 8px; padding-top: 8px;">
    `;

    exercises.forEach(ex => {
      cardHtml += `
        <div style="border-bottom: 1px dashed var(--border-glass); padding-bottom: 4px;">
          <div style="font-weight: 800; font-size: 0.88rem; color: var(--text-bright);">${ex.name}</div>
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-top: 2px;">
            <span style="color: var(--accent-green); font-weight: 700;">${ex.sets}</span>
            <span style="color: var(--text-sub);">${ex.notes}</span>
          </div>
        </div>
      `;
    });

    cardHtml += `</div></div>`;
    container.innerHTML += cardHtml;
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('gym-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('gym-theme', newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-btn');
  if (theme === 'dark') {
    btn.innerHTML = '<i class="fa-solid fa-sun" style="color:#fbbf24;"></i>';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-moon" style="color:#0284c7;"></i>';
  }
}

function switchSection(viewId, element) {
  document.querySelectorAll('.section-view').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });

  document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
  if (element) element.classList.add('active');

  const target = document.getElementById('view-' + viewId);
  if (target) {
    target.style.display = 'block';
    target.classList.add('active');
  }
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

function getRemainingDays(endDateStr) {
  if (!endDateStr) return null;
  const today = new Date();
  today.setHours(0,0,0,0);
  const end = new Date(endDateStr);
  end.setHours(0,0,0,0);
  if (isNaN(end.getTime())) return null;
  const diffTime = end.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function createMemberCardHtml(m) {
  if (!m) return '';
  const statusClass = m.status === 'Active' ? 'Active' : (m.status === 'Expiring Soon' ? 'Expiring' : (m.status === 'Expired' ? 'Expired' : 'NoSub'));
  const statusText = m.status === 'Active' ? 'نشط' : (m.status === 'Expiring Soon' ? 'تنتهي قريباً' : (m.status === 'Expired' ? 'منتهي' : 'بدون اشتراك'));
  const daysLeft = getRemainingDays(m.end_date);
  let daysDisplay = 'غير محدد';
  if (daysLeft !== null) {
    if (daysLeft < 0) daysDisplay = `منتهي منذ ${Math.abs(daysLeft)} يوم`;
    else if (daysLeft === 0) daysDisplay = 'ينتهي اليوم!';
    else daysDisplay = `متبقي ${daysLeft} يوم`;
  }

  const registeredDate = m.created_at ? new Date(m.created_at).toISOString().split('T')[0] : 'غير معروف';
  const categoryName = m.category || 'كمال أجسام';

  let workoutMonthVal = 1;
  if (m.notes && m.notes.includes('[شهر:')) {
    const mMatch = m.notes.match(/\[شهر:\s*(\d+)\]/);
    if (mMatch) workoutMonthVal = parseInt(mMatch[1]);
  }

  return `
    <div class="item-card-glass">
      <div class="card-header-flex">
        <div>
          <div class="item-name">${m.full_name || 'بدون اسم'}</div>
          <div class="item-meta"><i class="fa-solid fa-phone"></i> ${m.phone || 'بدون هاتف'}</div>
        </div>
        <span class="badge-curved ${statusClass}">${statusText}</span>
      </div>

      <div class="details-box-inner">
        <div class="info-row"><span class="info-lbl">السجل / القائمة:</span><span class="info-val" style="color:var(--accent-amber);">${categoryName}</span></div>
        ${categoryName === 'كمال أجسام' ? `<div class="info-row"><span class="info-lbl">شهر التمرين:</span><span class="info-val" style="color:var(--accent-neon);">الشهر ${workoutMonthVal}</span></div>` : ''}
        <div class="info-row"><span class="info-lbl">الخطة:</span><span class="info-val" style="color:var(--accent-neon);">${m.plan_name || 'لا يوجد'}</span></div>
        <div class="info-row"><span class="info-lbl">بدء الاشتراك:</span><span class="info-val">${m.start_date || 'غير محدد'}</span></div>
        <div class="info-row"><span class="info-lbl">انتهاء الاشتراك:</span><span class="info-val">${m.end_date || 'غير محدد'}</span></div>
        <div class="info-row"><span class="info-lbl">الأيام المتبقية:</span><span class="info-val" style="color:${daysLeft <= 5 ? (daysLeft < 0 ? 'var(--accent-red)' : 'var(--accent-amber)') : 'var(--accent-green)'};">${daysDisplay}</span></div>
        <div class="info-row"><span class="info-lbl">تاريخ التسجيل:</span><span class="info-val">${registeredDate}</span></div>
        <div class="info-row"><span class="info-lbl">ملاحظات:</span><span class="info-val">${m.notes || 'لا يوجد'}</span></div>
      </div>

      <div class="card-bottom-actions">
        <button class="action-icon-btn" onclick="openRenewModal(${m.id})" title="تجديد"><i class="fa-solid fa-rotate-right"></i></button>
        <button class="action-icon-btn" onclick="editMember(${m.id})" title="تعديل"><i class="fa-solid fa-pen"></i></button>
        <button class="action-icon-btn" onclick="deleteMember(${m.id})" title="حذف"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `;
}

async function loadAllData() {
  await loadDashboard();
  await loadMembers();
  await loadPlans();
}

function renderRecentSubscriptions(list) {
  const container = document.getElementById('recent-subscriptions-list');
  if (!container) return;
  container.innerHTML = '';
  if (!list || list.length === 0) {
    container.innerHTML = '<div style="color:var(--text-sub); font-size:0.95rem;">لا توجد نتائج تطابق البحث.</div>';
    return;
  }
  list.forEach(s => {
    container.innerHTML += `
      <div class="item-card-glass">
        <div class="card-header-flex">
          <div>
            <div class="item-name">${s.member_name || 'مشترك'}</div>
            <div class="item-meta"><i class="fa-solid fa-phone"></i> ${s.phone || 'غير مسجل'}</div>
          </div>
          <span class="badge-curved ${s.status || 'Active'}">${s.status === 'Active' ? 'نشط' : (s.status === 'Expiring Soon' ? 'قريب الانتهاء' : 'منتهي')}</span>
        </div>
        <div class="details-box-inner">
          <div class="info-row"><span class="info-lbl">الخطة:</span><span class="info-val">${s.plan_name || 'خطة عامة'}</span></div>
          <div class="info-row"><span class="info-lbl">السعر:</span><span class="info-val" style="color:var(--accent-green);">${s.price || 0} د.أ</span></div>
          <div class="info-row"><span class="info-lbl">بدأ في:</span><span class="info-val">${s.start_date || '-'}</span></div>
          <div class="info-row"><span class="info-lbl">ينتهي في:</span><span class="info-val">${s.end_date || '-'}</span></div>
        </div>
      </div>
    `;
  });
}

function filterRecentSubscriptions() {
  const q = document.getElementById('recent-search').value.toLowerCase();
  const filtered = globalRecentSubscriptions.filter(s => 
    (s.member_name && s.member_name.toLowerCase().includes(q)) || 
    (s.phone && s.phone.includes(q)) ||
    (s.plan_name && s.plan_name.toLowerCase().includes(q))
  );
  renderRecentSubscriptions(filtered);
}

async function loadDashboard() {
  try {
    const res = await fetch('/api/dashboard/stats');
    const data = await res.json();
    document.getElementById('stat-members').innerText = data.totalMembers || 0;
    document.getElementById('stat-active').innerText = data.totalActive || 0;
    document.getElementById('stat-expiring').innerText = data.totalExpiring || 0;
    document.getElementById('stat-expired').innerText = data.totalExpired || 0;

    globalRecentSubscriptions = data.recentSubscriptions || [];
    const searchVal = document.getElementById('recent-search') ? document.getElementById('recent-search').value : '';
    if (searchVal) {
      filterRecentSubscriptions();
    } else {
      renderRecentSubscriptions(globalRecentSubscriptions);
    }
  } catch (e) { console.error(e); }
}

async function loadMembers() {
  try {
    const res = await fetch('/api/members');
    globalMembers = await res.json();
    filterMembers();
    renderFilteredLists();
  } catch (e) { console.error(e); }
}

function renderMembers(list) {
  const container = document.getElementById('all-members-list');
  if (!container) return;
  container.innerHTML = '';
  if (!list || list.length === 0) {
    container.innerHTML = '<div style="color:var(--text-sub); font-size:0.95rem;">لا يوجد أعضاء في هذه القائمة.</div>';
    return;
  }
  list.forEach(m => container.innerHTML += createMemberCardHtml(m));
}

function filterCategoryTab(category, btnElem) {
  selectedCategoryFilter = category;
  document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');
  filterMembers();
}

function renderFilteredLists() {
  const expiringList = globalMembers.filter(m => m.status === 'Expiring Soon');
  const expiredList = globalMembers.filter(m => m.status === 'Expired');

  document.getElementById('badge-expiring-count').innerText = expiringList.length;
  document.getElementById('badge-expired-count').innerText = expiredList.length;

  const expiringContainer = document.getElementById('expiring-members-list');
  if (expiringContainer) {
    expiringContainer.innerHTML = '';
    if (expiringList.length === 0) {
      expiringContainer.innerHTML = '<div style="color:var(--text-sub); font-size:0.95rem;">لا يوجد أعضاء ينتهي اشتراكهم خلال 5 أيام.</div>';
    } else {
      expiringList.forEach(m => expiringContainer.innerHTML += createMemberCardHtml(m));
    }
  }

  const expiredContainer = document.getElementById('expired-members-list');
  if (expiredContainer) {
    expiredContainer.innerHTML = '';
    if (expiredList.length === 0) {
      expiredContainer.innerHTML = '<div style="color:var(--text-sub); font-size:0.95rem;">لا يوجد اشتراكات منتهية حالياً.</div>';
    } else {
      expiredList.forEach(m => expiredContainer.innerHTML += createMemberCardHtml(m));
    }
  }
}

function filterMembers() {
  const q = document.getElementById('member-search').value.toLowerCase();
  const filtered = globalMembers.filter(m => {
    const matchesQuery = (m.full_name && m.full_name.toLowerCase().includes(q)) || (m.phone && m.phone.includes(q));
    const memberCat = m.category || 'كمال أجسام';
    const matchesCat = (selectedCategoryFilter === 'الكل') || (memberCat === selectedCategoryFilter);
    return matchesQuery && matchesCat;
  });
  renderMembers(filtered);
}

async function loadPlans() {
  try {
    const res = await fetch('/api/plans');
    globalPlans = await res.json();
    const container = document.getElementById('all-plans-list');
    const select = document.getElementById('member-plan');
    const renewSelect = document.getElementById('renew-plan-id');
    
    if (container) container.innerHTML = '';
    if (select) select.innerHTML = '<option value="">-- اختر الخطة --</option>';
    if (renewSelect) renewSelect.innerHTML = '<option value="">-- اختر الخطة --</option>';

    globalPlans.forEach(p => {
      if (container) {
        container.innerHTML += `
          <div class="item-card-glass">
            <div class="card-header-flex">
              <div>
                <div class="item-name">${p.name}</div>
                <div class="item-meta"><i class="fa-solid fa-calendar-days"></i> ${p.duration_days} يوم</div>
              </div>
              <div style="font-weight:900; font-size:1.1rem; color:var(--accent-neon);">${p.price} د.أ</div>
            </div>
            <div class="card-bottom-actions">
              <button class="action-icon-btn" onclick="deletePlan(${p.id})" title="حذف الخطة"><i class="fa-solid fa-trash"></i></button>
            </div>
          </div>
        `;
      }
      const opt = `<option value="${p.id}">${p.name} (${p.price} د.أ - ${p.duration_days} يوم)</option>`;
      if (select) select.innerHTML += opt;
      if (renewSelect) renewSelect.innerHTML += opt;
    });
  } catch (e) { console.error(e); }
}

function openMemberModal() {
  document.getElementById('member-id').value = '';
  document.getElementById('member-form').reset();
  document.getElementById('member-category').value = 'كمال أجسام';
  document.getElementById('member-workout-month').value = '1';
  toggleWorkoutMonthField('كمال أجسام');
  document.getElementById('member-modal-title').innerText = 'إضافة مشترك جديد';
  document.getElementById('plan-select-group').style.display = 'flex';
  document.getElementById('date-select-group').style.display = 'flex';
  document.getElementById('member-start-date').valueAsDate = new Date();
  openModal('member-modal');
}

function editMember(id) {
  const m = globalMembers.find(x => x.id === id);
  if (!m) return;
  document.getElementById('member-id').value = m.id;
  document.getElementById('member-name').value = m.full_name;
  document.getElementById('member-phone').value = m.phone;
  document.getElementById('member-category').value = m.category || 'كمال أجسام';
  toggleWorkoutMonthField(m.category || 'كمال أجسام');
  
  let rawNotes = m.notes || '';
  let debtVal = '';
  let workoutMonthVal = '1';
  let cleanNotes = rawNotes;

  // استخراج قيمة الذمة والشهر
  if (rawNotes.includes('[ذمم:')) {
    const match = rawNotes.match(/\[ذمم:\s*([^\]]+)\]/);
    if (match) {
      debtVal = match[1];
      cleanNotes = cleanNotes.replace(/\[ذمم:\s*[^\]]+\]\s*-?\s*/, '');
    }
  }

  if (rawNotes.includes('[شهر:')) {
    const match = rawNotes.match(/\[شهر:\s*(\d+)\]/);
    if (match) {
      workoutMonthVal = match[1];
      cleanNotes = cleanNotes.replace(/\[شهر:\s*\d+\]\s*-?\s*/, '');
    }
  }

  document.getElementById('member-workout-month').value = workoutMonthVal;
  document.getElementById('member-debt').value = debtVal;
  document.getElementById('member-notes').value = cleanNotes;

  document.getElementById('member-modal-title').innerText = 'تعديل بيانات العضو';
  document.getElementById('plan-select-group').style.display = 'none';
  document.getElementById('date-select-group').style.display = 'none';
  openModal('member-modal');
}

function openRenewModal(memberId) {
  const m = globalMembers.find(x => x.id === memberId);
  document.getElementById('renew-member-id').value = memberId;
  document.getElementById('renew-start-date').valueAsDate = new Date();

  let workoutMonthVal = '1';
  if (m && m.notes && m.notes.includes('[شهر:')) {
    const match = m.notes.match(/\[شهر:\s*(\d+)\]/);
    if (match) workoutMonthVal = match[1];
  }
  
  const renewGroup = document.getElementById('renew-workout-month-group');
  if (m && (m.category || 'كمال أجسام') === 'كمال أجسام') {
    renewGroup.style.display = 'flex';
    document.getElementById('renew-workout-month').value = workoutMonthVal;
  } else {
    renewGroup.style.display = 'none';
  }

  openModal('renew-modal');
}

function openPlanModal() {
  document.getElementById('plan-form').reset();
  openModal('plan-modal');
}

async function handleMemberSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('member-id').value;
  const category = document.getElementById('member-category').value;
  const workoutMonth = document.getElementById('member-workout-month').value;
  const debtValue = document.getElementById('member-debt').value.trim();
  const rawNotes = document.getElementById('member-notes').value.trim();

  // دمج شهر التمرين والذمة مع حقل الملاحظات ليتم حفظهم مع العضو
  let finalNotes = rawNotes;

  if (category === 'كمال أجسام') {
    finalNotes = `[شهر: ${workoutMonth}]` + (finalNotes ? ` - ${finalNotes}` : '');
  }

  if (debtValue) {
    finalNotes = `[ذمم: ${debtValue}]` + (finalNotes ? ` - ${finalNotes}` : '');
  }

  const body = {
    full_name: document.getElementById('member-name').value,
    phone: document.getElementById('member-phone').value,
    category: category,
    notes: finalNotes,
    plan_id: document.getElementById('member-plan').value,
    start_date: document.getElementById('member-start-date').value
  };

  const url = id ? '/api/members/' + id : '/api/members';
  const method = id ? 'PUT' : 'POST';

  try {
    await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    closeModal('member-modal');
    await showCustomAlert(id ? 'تم تعديل بيانات المشترك بنجاح' : 'تم إضافة المشترك بنجاح', 'success');
    await loadAllData();
  } catch (err) {
    await showCustomAlert('حدث خطأ أثناء حفظ المشترك', 'error');
  }
}

async function handleRenewSubmit(e) {
  e.preventDefault();
  const memberId = document.getElementById('renew-member-id').value;
  const selectedMonth = document.getElementById('renew-workout-month').value;
  
  const m = globalMembers.find(x => x.id == memberId);
  if (m && (m.category || 'كمال أجسام') === 'كمال أجسام') {
    let currentNotes = m.notes || '';
    if (currentNotes.includes('[شهر:')) {
      currentNotes = currentNotes.replace(/\[شهر:\s*\d+\]/, `[شهر: ${selectedMonth}]`);
    } else {
      currentNotes = `[شهر: ${selectedMonth}]` + (currentNotes ? ` - ${currentNotes}` : '');
    }

    await fetch('/api/members/' + memberId, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: m.full_name,
        phone: m.phone,
        category: m.category,
        notes: currentNotes
      })
    });
  }

  const body = {
    member_id: memberId,
    plan_id: document.getElementById('renew-plan-id').value,
    start_date: document.getElementById('renew-start-date').value
  };

  try {
    await fetch('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    closeModal('renew-modal');
    await showCustomAlert('تم تجديد اشتراك العضو بنجاح', 'success');
    await loadAllData();
  } catch (err) {
    await showCustomAlert('حدث خطأ أثناء التجديد', 'error');
  }
}

async function handlePlanSubmit(e) {
  e.preventDefault();
  const body = {
    name: document.getElementById('plan-name').value,
    price: document.getElementById('plan-price').value,
    duration_days: document.getElementById('plan-duration').value,
    active: 1
  };

  try {
    await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    closeModal('plan-modal');
    await showCustomAlert('تمت إضافة الخطة الجديدة بنجاح', 'success');
    await loadPlans();
  } catch (err) {
    await showCustomAlert('حدث خطأ أثناء حفظ الخطة', 'error');
  }
}

async function deleteMember(id) {
  const confirmed = await showCustomConfirm('هل أنت متأكد من حذف هذا العضو من النظام؟');
  if (!confirmed) return;

  try {
    await fetch('/api/members/' + id, { method: 'DELETE' });
    await showCustomAlert('تم حذف المشترك بنجاح', 'success');
    await loadAllData();
  } catch (err) {
    await showCustomAlert('حدث خطأ أثناء حذف المشترك', 'error');
  }
}

async function deletePlan(id) {
  const confirmed = await showCustomConfirm('هل أنت متأكد من حذف هذه الخطة؟');
  if (!confirmed) return;

  try {
    await fetch('/api/plans/' + id, { method: 'DELETE' });
    await showCustomAlert('تم حذف الخطة بنجاح', 'success');
    await loadPlans();
  } catch (err) {
    await showCustomAlert('حدث خطأ أثناء حذف الخطة', 'error');
  }
}

initTheme();
checkExistingSession();
