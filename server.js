const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const crypto = require('crypto');

// تثبيت المنطقة الزمنية للسيرفر على توقيت الأردن (عمان)
process.env.TZ = 'Asia/Amman';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SESSION_SECRET = process.env.GYM_SESSION_SECRET || process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET;
function signSession(payload) {
  const data=Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature=crypto.createHmac('sha256',SESSION_SECRET).update(data).digest('base64url');
  return data+'.'+signature;
}
function isAdmin(req) {
  if(!SESSION_SECRET)return false;
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('gym_admin_session='));
  if(!token)return false;
  const [data,signature]=token.slice('gym_admin_session='.length).split('.');
  if(!data||!signature)return false;
  const expected=crypto.createHmac('sha256',SESSION_SECRET).update(data).digest();
  let supplied;try{supplied=Buffer.from(signature,'base64url')}catch{return false}
  if(supplied.length!==expected.length||!crypto.timingSafeEqual(supplied,expected))return false;
  try{const p=JSON.parse(Buffer.from(data,'base64url').toString());return p.role==='admin'&&p.exp>Date.now()}catch{return false}
}
function adminOnly(req,res,next){if(!isAdmin(req))return res.status(401).json({error:'يلزم تسجيل الدخول كمدير'});next()}
function audit(action,member_id,details={}) {
  return supabase.from('gym_activity_log').insert([{action,member_id,details}]).then(({error})=>{if(error)console.error('Audit error:',error.message)}).catch(err=>console.error('Audit error:',err.message));
}


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
app.post('/api/admin/login', (req,res)=>{
  const passcode=String(req.body?.passcode||'');
  const secret=process.env.ADMIN_PASSWORD||process.env.ADMIN_SECRET;
  if(!secret||!SESSION_SECRET)return res.status(503).json({error:'يجب ضبط ADMIN_PASSWORD في Render'});
  const a=Buffer.from(passcode),b=Buffer.from(secret);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return res.status(401).json({error:'الرمز السري غير صحيح'});
  const token=signSession({role:'admin',exp:Date.now()+7*24*60*60*1000});
  res.setHeader('Set-Cookie','gym_admin_session='+token+'; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800'+(req.secure||req.headers['x-forwarded-proto']==='https'?'; Secure':''));
  res.json({success:true});
});
app.post('/api/admin/logout',(req,res)=>{res.setHeader('Set-Cookie','gym_admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');res.json({success:true})});
app.get('/api/admin/session',(req,res)=>res.json({admin:isAdmin(req)}));
app.use('/api',(req,res,next)=>{
  if(req.path==='/admin/login'||req.path==='/admin/logout'||req.path==='/admin/session'||req.path==='/workouts/bodybuilding'||req.path==='/member/lookup')return next();
  return adminOnly(req,res,next);
});
// Compatibility-only member portal lookup. Phone-number login is not strong authentication.
// Return only the single member's portal fields, never the entire member directory.
app.post('/api/member/lookup', async(req,res)=>{
  const phone=String(req.body?.phone||'').trim();
  if(!/^\+?[0-9 -]{1,20}$/.test(phone) || !/[0-9]/.test(phone))return res.status(400).json({error:'أدخل رقم الهاتف المسجل بشكل صحيح'});
  try{
    const {data:member,error}=await supabase.from('members').select('id,full_name,phone,category,notes').eq('phone',phone).limit(1).maybeSingle();
    if(error)throw error;
    if(!member)return res.status(404).json({error:'غير موجود'});
    const {data:sub,error:subErr}=await supabase.from('subscriptions').select('start_date,end_date,plan_id,membership_plans(name)').eq('member_id',member.id).order('id',{ascending:false}).limit(1).maybeSingle();
    if(subErr)throw subErr;
    res.json({...member,start_date:sub?.start_date||null,end_date:sub?.end_date||null,plan_name:sub?.membership_plans?.name||null,status:sub?calculateStatus(sub.end_date):'No Subscription'});
  }catch(err){res.status(500).json({error:err.message})}
});
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const subscriptionQuery = supabase
      .from('subscriptions')
      .select(`
        id, start_date, end_date, price,
        members ( full_name, phone, category ),
        membership_plans ( name )
      `)
      .order('id', { ascending: false });

    const countQuery = supabase.from('members').select('*', { count: 'exact', head: true });
    const [{ data: subscriptions, error: subErr }, { count: totalMembers, error: countErr }] = await Promise.all([subscriptionQuery, countQuery]);
    if (subErr) throw subErr;
    if (countErr) throw countErr;

    // نعتبر أحدث اشتراك فقط لكل عضو هو الاشتراك الحالي.
    // هذا يمنع الاشتراكات القديمة/المنتهية من احتساب العضو كمنتهي بعد التجديد.
    const latestByMember = new Map();
    for (const sub of (subscriptions || [])) {
      const memberKey = sub.members?.phone || sub.member_id || `sub-${sub.id}`;
      if (!latestByMember.has(memberKey)) latestByMember.set(memberKey, sub);
    }

    let totalActive = 0, totalExpiring = 0, totalExpired = 0;
    const subscriptionsWithStatus = Array.from(latestByMember.values()).map((sub) => {
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

    res.json({
      totalMembers: totalMembers || 0,
      totalActive,
      totalExpiring,
      totalExpired,
      totalSubscriptions: subscriptionsWithStatus.length,
      // واجهة البداية تعرض آخر 5 أعضاء/اشتراكات حالية فقط.
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
    const [memberResult, subscriptionResult, measurementResult] = await Promise.all([
      supabase.from('members').select('*').order('id', { ascending: false }),
      supabase.from('subscriptions').select('*, membership_plans(name)').order('id', { ascending: false }),
      supabase.from('fitness_measurements').select('*')
    ]);
    const { data: members, error: memErr } = memberResult;
    const { data: subscriptions, error: subErr } = subscriptionResult;
    const { data: measurements, error: measurementError } = measurementResult;
    if (memErr) throw memErr;
    if (subErr) throw subErr;
    if (measurementError) throw measurementError;
    const measurementMap = new Map((measurements || []).map(x => [x.member_id, x]));

    const latestSubscriptionByMember = new Map();
    for (const sub of (subscriptions || [])) {
      if (!latestSubscriptionByMember.has(sub.member_id)) latestSubscriptionByMember.set(sub.member_id, sub);
    }

    const formattedMembers = (members || []).map(m => {
      const lastSub = latestSubscriptionByMember.get(m.id);
      return {
        ...m,
        measurements: m.category === 'لياقة بدنية' ? (measurementMap.get(m.id) || null) : null,
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

        const {data:initialSub,error:initialError}=await supabase.from('subscriptions').insert([{
          member_id: newMember.id,
          plan_id: plan.id,
          price: plan.price,
          start_date,
          end_date: endDateStr
        }]).select().single();
        if(initialError)throw initialError;
        const {error:eventError}=await supabase.from('gym_subscription_events').insert([{
          member_id:newMember.id,subscription_id:initialSub.id,plan_id:plan.id,
          price:Number(plan.price),start_date,end_date:endDateStr
        }]);
        if(eventError)console.error('Initial subscription history insert failed:',eventError.message);
      }
    }
    await audit('member_created',newMember.id,{name:newMember.full_name});
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
    await audit('member_updated',Number(req.params.id),{full_name});
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Body measurements are available only for fitness members.
const measurementFields = ['chest', 'waist', 'arms', 'hips', 'calves', 'thigh', 'weight'];
app.put('/api/members/:id/measurements', async (req, res) => {
  try {
    const { data: member, error: lookupError } = await supabase.from('members').select('id,category').eq('id', req.params.id).single();
    if (lookupError || !member) return res.status(404).json({ error: 'العضو غير موجود' });
    if (member.category !== 'لياقة بدنية') return res.status(403).json({ error: 'القياسات متاحة للياقة البدنية فقط' });
    const values = {};
    for (const field of measurementFields) {
      const raw = req.body[field];
      if (raw !== undefined && raw !== null && raw !== '') {
        const num = Number(raw);
        if (!Number.isFinite(num) || num < 0 || num > 1000) return res.status(400).json({ error: 'قيمة قياس غير صحيحة' });
        values[field] = num;
      } else values[field] = null;
    }
    const { data, error } = await supabase.from('fitness_measurements').upsert({ member_id: member.id, ...values, updated_at: new Date().toISOString() }, { onConflict: 'member_id' }).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('members').delete().eq('id', req.params.id);
    if (error) throw error;
    await audit('member_deleted',null,{member_id:Number(req.params.id)});
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

    // التجديد يعدّل نفس سجل الاشتراك الحالي بدلاً من إنشاء اشتراك جديد
    // حتى لا يظهر للعضو اشتراك سابق منتهي بعد كل عملية تجديد.
    const { data: existingSub, error: existingErr } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('member_id', parseInt(member_id))
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingErr) throw existingErr;

    const subscriptionData = {
      member_id: parseInt(member_id),
      plan_id: parseInt(plan_id),
      price: plan.price,
      start_date,
      end_date: endDateStr
    };

    let savedSub, subErr;
    if (existingSub) {
      ({ data: savedSub, error: subErr } = await supabase
        .from('subscriptions')
        .update(subscriptionData)
        .eq('id', existingSub.id)
        .select()
        .single());
    } else {
      ({ data: savedSub, error: subErr } = await supabase
        .from('subscriptions')
        .insert([subscriptionData])
        .select()
        .single());
    }

    if (subErr) throw subErr;
    const {error:eventError}=await supabase.from('gym_subscription_events').insert([{member_id:Number(member_id),subscription_id:savedSub.id,plan_id:Number(plan_id),price:Number(plan.price),start_date,end_date:endDateStr}]);
    if(eventError)console.error('Subscription history insert failed:',eventError.message);
    await audit('subscription_renewed',Number(member_id),{subscription_id:savedSub.id,price:plan.price,history_saved:!eventError});
    res.json({...savedSub,history_saved:!eventError});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


const memberId=req=>Number(req.params.id);
app.get('/api/ops/member/:id',adminOnly,async(req,res)=>{
  try{
    const id=memberId(req);
    if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'معرّف غير صالح'});
    const [payments,attendance,events]=await Promise.all([
      supabase.from('gym_payments').select('*').eq('member_id',id).order('created_at',{ascending:false}),
      supabase.from('gym_attendance').select('*').eq('member_id',id).order('checked_in_at',{ascending:false}).limit(100),
      supabase.from('gym_subscription_events').select('*').eq('member_id',id).order('created_at',{ascending:false})
    ]);
    for(const result of [payments,attendance,events])if(result.error)throw result.error;
    const {data:current,error:subError}=await supabase.from('subscriptions').select('price').eq('member_id',id).order('id',{ascending:false}).limit(1).maybeSingle();
    if(subError)throw subError;
    const paid=payments.data.reduce((sum,p)=>sum+Number(p.amount||0),0);
    const due=events.data.length?events.data.reduce((sum,e)=>sum+Number(e.price||0),0):Number(current?.price||0);
    res.json({payments:payments.data,attendance:attendance.data,events:events.data,financial:{due,paid,balance:due-paid,estimated:events.data.length===0}});
  }catch(err){res.status(500).json({error:err.message})}
});
app.post('/api/ops/member/:id/payments',adminOnly,async(req,res)=>{
  const id=memberId(req),amount=Number(req.body?.amount);
  if(!Number.isSafeInteger(id)||id<1||!Number.isFinite(amount)||amount<=0||amount>1000000)return res.status(400).json({error:'بيانات الدفعة غير صالحة'});
  const note=String(req.body?.note||'').slice(0,500);
  const {data,error}=await supabase.from('gym_payments').insert([{member_id:id,amount,note}]).select().single();
  if(error)return res.status(500).json({error:error.message});
  await audit('payment_created',id,{payment_id:data.id,amount});
  res.json(data);
});
app.post('/api/ops/member/:id/attendance',adminOnly,async(req,res)=>{
  const id=memberId(req);if(!Number.isSafeInteger(id)||id<1)return res.status(400).json({error:'معرّف غير صالح'});
  const today=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Amman'});
  const {data:latest,error:readError}=await supabase.from('gym_attendance').select('checked_in_at').eq('member_id',id).order('checked_in_at',{ascending:false}).limit(1);
  if(readError)return res.status(500).json({error:readError.message});
  if(latest?.length&&new Date(latest[0].checked_in_at).toLocaleDateString('en-CA',{timeZone:'Asia/Amman'})===today)return res.status(409).json({error:'تم تسجيل حضور المشترك اليوم'});
  const {data,error}=await supabase.from('gym_attendance').insert([{member_id:id}]).select().single();
  if(error)return res.status(500).json({error:error.message});
  await audit('attendance_created',id,{attendance_id:data.id});
  res.json(data);
});
app.get('/api/ops/activity',adminOnly,async(req,res)=>{
  const {data,error}=await supabase.from('gym_activity_log').select('*').order('created_at',{ascending:false}).limit(100);
  if(error)return res.status(500).json({error:error.message});res.json(data);
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
