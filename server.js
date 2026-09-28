const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// تثبيت المنطقة الزمنية للسيرفر على توقيت الأردن (عمان)
process.env.TZ = 'Asia/Amman';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// بيانات الاتصال الخاصة بـ Supabase (من متغيرات البيئة)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ================= جدول تمارين كمال الأجسام (مخزن بالسيرفر) ================= //
const BODYBUILDING_WORKOUTS = {
  1: {
    title: "الشهر الأول (مبتدئ - تهيئة وتحمل)",
    exercises: {
      "صدر": [
        { name: "بنش برس مستوي بالبار", sets: "3 مجموعات × 12 تكرار", notes: "التركيز على التكنيك والأوزان الخفيفة" },
        { name: "تجميع فراشة (Pec Deck Fly)", sets: "3 مجموعات × 15 تكرار", notes: "تحكم بالوزن أثناء الرجوع" }
      ],
      "ظهر": [
        { name: "سحب عالي أمامي (Lat Pulldown)", sets: "3 مجموعات × 12 تكرار", notes: "عصر عضلة الظهر لأسفل" },
        { name: "سحب أرضي ضيق (Seated Cable Row)", sets: "3 مجموعات × 12 تكرار", notes: "الحفاظ على الظهر مستقيماً" }
      ],
      "أكتاف": [
        { name: "ضغط أكتاف بالدمبلز (Dumbbell Press)", sets: "3 مجموعات × 12 تكرار", notes: "عدم إنزال الدمبلز لأسفل الأذن" },
        { name: "رفرفة جانبي بالدمبلز (Lateral Raise)", sets: "3 مجموعات × 15 تكرار", notes: "وزن خفيف وتركيز عضلي كامل" }
      ],
      "أرجل": [
        { name: "دفع أرجل بالماكينة (Leg Press)", sets: "3 مجموعات × 12 تكرار", notes: "عدم قفل مفصل الركبة بالأعلى" },
        { name: "مد أرجل أمامي (Leg Extension)", sets: "3 مجموعات × 15 تكرار", notes: "ثبات ثانية واحدة في أعلى الحركة" }
      ]
    }
  },
  2: {
    title: "الشهر الثاني (متوسط - تضخيم وشدة أرقـى)",
    exercises: {
      "صدر": [
        { name: "بنش برس مائل بالدمبلز (Incline Press)", sets: "4 مجموعات × 10 تكرارات", notes: "استهداف المنطقة العلوية للصدر" },
        { name: "متوازي (Dips)", sets: "3 مجموعات × 10 تكرارات", notes: "ميل خفيف بالجذع للأمام" }
      ],
      "ظهر": [
        { name: "تجديف بالبار (Barbell Row)", sets: "4 مجموعات × 10 تكرارات", notes: "تخانات وقوة الظهر" },
        { name: "سحب عالي قبضة معكوسة", sets: "4 مجموعات × 10 تكرارات", notes: "استهداف أسفل الظهر والمجنح" }
      ],
      "أكتاف": [
        { name: "ضغط أكتاف أمامي بالبار (Overhead Press)", sets: "4 مجموعات × 10 تكرارات", notes: "قوة الكتف الأمامي والترابيس" },
        { name: "رفرفة خلفي بالماكينة (Rear Delt Fly)", sets: "4 مجموعات × 12 تكرار", notes: "عزل الكتف الخلفي" }
      ],
      "أرجل": [
        { name: "سكوات بالبار (Barbell Squat)", sets: "4 مجموعات × 10 تكرارات", notes: "التمرين الأساسي للأرجل مع نزول صحيح" },
        { name: "ثني أرجل خلفي بالماكينة (Leg Curl)", sets: "4 مجموعات × 12 تكرار", notes: "استهداف عضلات الهامسترينغ" }
      ]
    }
  },
  3: {
    title: "الشهر الثالث (متقدم - أوزان وشدة عالية)",
    exercises: {
      "صدر": [
        { name: "بنش برس مستوي بار أوزان ثقيلة", sets: "4 مجموعات × 6-8 تكرارات", notes: "زيادة الوزن تدريجياً بمساعدة مرافق" },
        { name: "تجميع كابل مائل (Cable Crossover)", sets: "4 مجموعات × 12-15 تكرار", notes: "ضخ دم عالي وتفتيح عضلة الصدر" }
      ],
      "ظهر": [
        { name: "سحب عقلة أو سحب عالي ثقيل", sets: "4 مجموعات × 8 تكرارات", notes: "أقصى مدى حركي وانقباض" },
        { name: "سحب دمبل فردي (Dumbbell Row)", sets: "4 مجموعات × 10 تكرارات لكل يد", notes: "تركيز أقصى لكل جانب" }
      ],
      "أكتاف": [
        { name: "ضغط أرنولد بالدمبلز (Arnold Press)", sets: "4 مجموعات × 10 تكرارات", notes: "حركة دورانية شمولية للكتف" },
        { name: "سحب بار للذقن (Upright Row)", sets: "4 مجموعات × 12 تكرار", notes: "استهداف الأكتاف والترابيس العريضة" }
      ],
      "أرجل": [
        { name: "رميان ديدلفت (Romanian Deadlift)", sets: "4 مجموعات × 8-10 تكرارات", notes: "عزل قوي للظهر السفلي والخلفيات" },
        { name: "طعن بالدمبلز (Dumbbell Lunges)", sets: "3 مجموعات × 12 خطوة", notes: "تقوية وتوازن الأرجل" }
      ]
    }
  }
};

// دالة حساب حالة الاشتراك بناءً على توقيت عمان
function calculateStatus(endDateStr) {
  if (!endDateStr) return 'No Subscription';
  
  const now = new Date();
  const jordanDateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Amman' });
  const today = new Date(jordanDateStr);
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(endDateStr);
  endDate.setHours(0, 0, 0, 0);

  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 5) return 'Expiring Soon';
  return 'Active';
}

// ================= API ENDPOINTS ================= //

// تسجيل دخول الكابتن بالرمز السري من ADMIN_PASSWORD في .env
app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body;
  const adminSecret = process.env.ADMIN_PASSWORD;

  if (passcode === adminSecret) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "الرمز السري غير صحيح!" });
  }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const { data: subscriptions, error: subErr } = await supabase
      .from('subscriptions')
      .select(`
        id, start_date, end_date, price,
        members ( full_name, phone, category ),
        membership_plans ( name )
      `)
      .order('id', { ascending: false });

    if (subErr) throw subErr;

    let totalActive = 0, totalExpiring = 0, totalExpired = 0;

    const subscriptionsWithStatus = (subscriptions || []).map((sub) => {
      const status = calculateStatus(sub.end_date);
      if (status === 'Active') totalActive++;
      if (status === 'Expiring Soon') totalExpiring++;
      if (status === 'Expired') totalExpired++;
      return {
        id: sub.id,
        start_date: sub.start_date,
        end_date: sub.end_date,
        price: sub.price,
        member_name: sub.members?.full_name || 'غير معروف',
        phone: sub.members?.phone || '',
        category: sub.members?.category || 'كمال أجسام',
        plan_name: sub.membership_plans?.name || 'غير معروف',
        status
      };
    });

    const { data: recentMembers } = await supabase
      .from('members')
      .select('*')
      .order('id', { ascending: false })
      .limit(5);

    res.json({
      totalMembers: recentMembers ? recentMembers.length : 0,
      totalActive,
      totalExpiring,
      totalExpired,
      totalSubscriptions: subscriptions ? subscriptions.length : 0,
      recentMembers: recentMembers || [],
      recentSubscriptions: subscriptionsWithStatus.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/plans', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('membership_plans')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plans', async (req, res) => {
  const { name, description, price, duration_days, active } = req.body;
  try {
    const { data, error } = await supabase
      .from('membership_plans')
      .insert([{ name, description: description || '', price: parseFloat(price), duration_days: parseInt(duration_days), active: active ? 1 : 0 }])
      .select();

    if (error) throw error;
    res.json(data[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/plans/:id', async (req, res) => {
  const { name, description, price, duration_days, active } = req.body;
  try {
    const { error } = await supabase
      .from('membership_plans')
      .update({ name, description: description || '', price: parseFloat(price), duration_days: parseInt(duration_days), active: active ? 1 : 0 })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('membership_plans').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/members', async (req, res) => {
  try {
    const { data: members, error: memErr } = await supabase
      .from('members')
      .select('*')
      .order('id', { ascending: false });

    if (memErr) throw memErr;

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*, membership_plans(name)')
      .order('id', { ascending: false });

    const formattedMembers = (members || []).map(m => {
      const lastSub = (subscriptions || []).find(s => s.member_id === m.id);
      return {
        ...m,
        category: m.category || 'كمال أجسام',
        subscription_id: lastSub ? lastSub.id : null,
        start_date: lastSub ? lastSub.start_date : null,
        end_date: lastSub ? lastSub.end_date : null,
        subscription_price: lastSub ? lastSub.price : null,
        plan_name: lastSub?.membership_plans?.name || null,
        plan_id: lastSub ? lastSub.plan_id : null,
        status: lastSub ? calculateStatus(lastSub.end_date) : 'No Subscription'
      };
    });

    res.json(formattedMembers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/members/:id', async (req, res) => {
  try {
    const { data: member, error: memErr } = await supabase
      .from('members')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (memErr || !member) return res.status(404).json({ error: 'Member not found' });

    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*, membership_plans(name)')
      .eq('member_id', req.params.id)
      .order('id', { ascending: false });

    const history = (subscriptions || []).map(sub => ({
      ...sub,
      plan_name: sub.membership_plans?.name || '',
      status: calculateStatus(sub.end_date)
    }));

    res.json({
      ...member,
      category: member.category || 'كمال أجسام',
      currentSubscription: history[0] || null,
      history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/members', async (req, res) => {
  const { full_name, phone, category, notes, plan_id, start_date } = req.body;
  try {
    const selectedCategory = category || 'كمال أجسام';
    
    const { data: newMember, error: memErr } = await supabase
      .from('members')
      .insert([{ 
        full_name, 
        phone, 
        category: selectedCategory, 
        notes: notes || '' 
      }])
      .select()
      .single();

    if (memErr) throw memErr;

    if (plan_id && start_date) {
      const { data: plan } = await supabase
        .from('membership_plans')
        .select('*')
        .eq('id', plan_id)
        .single();

      if (plan) {
        const start = new Date(start_date);
        const end = new Date(start);
        end.setDate(end.getDate() + plan.duration_days);
        const endDateStr = end.toISOString().split('T')[0];

        await supabase.from('subscriptions').insert([{
          member_id: newMember.id,
          plan_id: plan.id,
          price: plan.price,
          start_date,
          end_date: endDateStr
        }]);
      }
    }
    res.json(newMember);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  const { full_name, phone, category, notes } = req.body;
  try {
    const { error } = await supabase
      .from('members')
      .update({ 
        full_name, 
        phone, 
        category: category || 'كمال أجسام', 
        notes: notes || '' 
      })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('members').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  const { member_id, plan_id, start_date } = req.body;
  try {
    const { data: plan, error: planErr } = await supabase
      .from('membership_plans')
      .select('*')
      .eq('id', plan_id)
      .single();

    if (planErr || !plan) return res.status(404).json({ error: 'Plan not found' });

    const start = new Date(start_date);
    const end = new Date(start);
    end.setDate(end.getDate() + plan.duration_days);
    const endDateStr = end.toISOString().split('T')[0];

    const { data: newSub, error: subErr } = await supabase
      .from('subscriptions')
      .insert([{
        member_id: parseInt(member_id),
        plan_id: parseInt(plan_id),
        price: plan.price,
        start_date,
        end_date: endDateStr
      }])
      .select()
      .single();

    if (subErr) throw subErr;
    res.json(newSub);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint لجلب تمارين كمال الأجسام الخاصة بكل شهر
app.get('/api/workouts/bodybuilding', (req, res) => {
  res.json(BODYBUILDING_WORKOUTS);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} (Asia/Amman Timezone)`);
});
