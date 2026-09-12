const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// إعداد الاتصال بقاعدة بيانات Supabase 
const pool = new Pool({
  user: 'postgres',
  host: 'db.cufcarfhygveznaufruv.supabase.co',
  database: 'postgres',
  password: '6hC?Qt8mASzsJd+',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS members (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS membership_plans (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price NUMERIC(10, 2) NOT NULL,
        duration_days INTEGER NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        member_id INTEGER REFERENCES members(id) ON DELETE CASCADE,
        plan_id INTEGER REFERENCES membership_plans(id) ON DELETE CASCADE,
        price NUMERIC(10, 2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const plansCount = await pool.query('SELECT COUNT(*) FROM membership_plans');
    if (parseInt(plansCount.rows[0].count) === 0) {
      await pool.query(`
        INSERT INTO membership_plans (name, description, price, duration_days, active) VALUES
        ('كمال أجسام / جيم', 'اشتراك صالة الأجهزة والحديد كاملة', 15.00, 30, 1),
        ('تايكوندو', 'حصص تايكوندو وتدريب قتال', 20.00, 30, 1),
        ('ملاكمة', 'تدريب ملاكمة مع مدرب وحلبة', 20.00, 30, 1);
      `);
      console.log('Default membership plans seeded in Supabase.');
    }

    console.log('Connected to Supabase PostgreSQL Database.');
  } catch (err) {
    console.error('Database connection error:', err.message);
  }
}

initDatabase();

function calculateStatus(endDateStr) {
  if (!endDateStr) return 'No Subscription';
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const endDate = new Date(endDateStr);
  endDate.setHours(0, 0, 0, 0);

  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays <= 5) return 'Expiring Soon';
  return 'Active';
}

// APIs
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        s.id, s.start_date, s.end_date, s.price,
        m.full_name as member_name, m.phone,
        p.name as plan_name
      FROM subscriptions s
      JOIN members m ON s.member_id = m.id
      JOIN membership_plans p ON s.plan_id = p.id
      ORDER BY s.id DESC
    `;
    const { rows } = await pool.query(query);

    let totalActive = 0, totalExpiring = 0, totalExpired = 0;

    const subscriptionsWithStatus = rows.map((sub) => {
      const status = calculateStatus(sub.end_date);
      if (status === 'Active') totalActive++;
      if (status === 'Expiring Soon') totalExpiring++;
      if (status === 'Expired') totalExpired++;
      return { ...sub, status };
    });

    const recentMembers = await pool.query('SELECT * FROM members ORDER BY id DESC LIMIT 5');

    res.json({
      totalMembers: recentMembers.rows.length,
      totalActive,
      totalExpiring,
      totalExpired,
      totalSubscriptions: rows.length,
      recentMembers: recentMembers.rows,
      recentSubscriptions: subscriptionsWithStatus.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/plans', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM membership_plans ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plans', async (req, res) => {
  const { name, description, price, duration_days, active } = req.body;
  try {
    const query = 'INSERT INTO membership_plans (name, description, price, duration_days, active) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const values = [name, description || '', parseFloat(price), parseInt(duration_days), active ? 1 : 0];
    const { rows } = await pool.query(query, values);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/plans/:id', async (req, res) => {
  const { name, description, price, duration_days, active } = req.body;
  try {
    const query = 'UPDATE membership_plans SET name=$1, description=$2, price=$3, duration_days=$4, active=$5 WHERE id=$6';
    await pool.query(query, [name, description || '', parseFloat(price), parseInt(duration_days), active ? 1 : 0, req.params.id]);
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/plans/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM membership_plans WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/members', async (req, res) => {
  try {
    const query = `
      SELECT 
        m.*,
        s.id as subscription_id,
        TO_CHAR(s.start_date, 'YYYY-MM-DD') as start_date,
        TO_CHAR(s.end_date, 'YYYY-MM-DD') as end_date,
        s.price as subscription_price,
        p.name as plan_name,
        p.id as plan_id
      FROM members m
      LEFT JOIN subscriptions s ON s.id = (
        SELECT id FROM subscriptions WHERE member_id = m.id ORDER BY id DESC LIMIT 1
      )
      LEFT JOIN membership_plans p ON s.plan_id = p.id
      ORDER BY m.id DESC
    `;
    const { rows } = await pool.query(query);

    const members = rows.map((row) => ({
      ...row,
      status: row.end_date ? calculateStatus(row.end_date) : 'No Subscription'
    }));

    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/members/:id', async (req, res) => {
  try {
    const member = await pool.query('SELECT * FROM members WHERE id = $1', [req.params.id]);
    if (member.rows.length === 0) return res.status(404).json({ error: 'Member not found' });

    const subQuery = `
      SELECT s.id, s.member_id, s.plan_id, s.price, 
             TO_CHAR(s.start_date, 'YYYY-MM-DD') as start_date, 
             TO_CHAR(s.end_date, 'YYYY-MM-DD') as end_date, 
             p.name as plan_name 
      FROM subscriptions s
      JOIN membership_plans p ON s.plan_id = p.id
      WHERE s.member_id = $1
      ORDER BY s.id DESC
    `;
    const subscriptions = await pool.query(subQuery, [req.params.id]);

    const history = subscriptions.rows.map((sub) => ({
      ...sub,
      status: calculateStatus(sub.end_date)
    }));

    res.json({
      ...member.rows[0],
      currentSubscription: history[0] || null,
      history
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/members', async (req, res) => {
  const { full_name, phone, notes, plan_id, start_date } = req.body;
  try {
    const memberRes = await pool.query('INSERT INTO members (full_name, phone, notes) VALUES ($1, $2, $3) RETURNING *', [full_name, phone, notes || '']);
    const newMember = memberRes.rows[0];

    if (plan_id && start_date) {
      const planRes = await pool.query('SELECT * FROM membership_plans WHERE id = $1', [plan_id]);
      if (planRes.rows.length > 0) {
        const plan = planRes.rows[0];
        const start = new Date(start_date);
        const end = new Date(start);
        end.setDate(end.getDate() + plan.duration_days);
        const endDateStr = end.toISOString().split('T')[0];

        await pool.query(
          'INSERT INTO subscriptions (member_id, plan_id, price, start_date, end_date) VALUES ($1, $2, $3, $4, $5)',
          [newMember.id, plan.id, plan.price, start_date, endDateStr]
        );
      }
    }
    res.json(newMember);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/members/:id', async (req, res) => {
  const { full_name, phone, notes } = req.body;
  try {
    await pool.query('UPDATE members SET full_name=$1, phone=$2, notes=$3 WHERE id=$4', [full_name, phone, notes || '', req.params.id]);
    res.json({ updated: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/members/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM members WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/subscriptions', async (req, res) => {
  const { member_id, plan_id, start_date } = req.body;
  try {
    const planRes = await pool.query('SELECT * FROM membership_plans WHERE id = $1', [plan_id]);
    if (planRes.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });

    const plan = planRes.rows[0];
    const start = new Date(start_date);
    const end = new Date(start);
    end.setDate(end.getDate() + plan.duration_days);
    const endDateStr = end.toISOString().split('T')[0];

    const { rows } = await pool.query(
      'INSERT INTO subscriptions (member_id, plan_id, price, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [member_id, plan_id, plan.price, start_date, endDateStr]
    );

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
