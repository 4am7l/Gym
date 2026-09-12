const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Local SQLite Database
const db = new sqlite3.Database('./gym_system.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to local SQLite database.');
    initDatabase();
  }
});

// Database Initialization
function initDatabase() {
  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON');

    // Members Table
    db.run(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Membership Plans Table
    db.run(`
      CREATE TABLE IF NOT EXISTS membership_plans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        duration_days INTEGER NOT NULL,
        active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Subscriptions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        member_id INTEGER NOT NULL,
        plan_id INTEGER NOT NULL,
        price REAL NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE CASCADE,
        FOREIGN KEY (plan_id) REFERENCES membership_plans (id) ON DELETE CASCADE
      )
    `, () => {
      seedDefaultPlans();
    });
  });
}

// Seed initial plans if empty
function seedDefaultPlans() {
  db.get('SELECT COUNT(*) as count FROM membership_plans', [], (err, row) => {
    if (err) return;
    if (row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO membership_plans (name, description, price, duration_days, active) VALUES (?, ?, ?, ?, 1)');
      stmt.run('Weight Training / Gym', 'Access to general weightlifting & cardio equipment', 15, 30);
      stmt.run('Taekwondo', 'Full access to martial arts training & group classes', 20, 30);
      stmt.run('Boxing', 'Boxing classes and heavy bag ring access', 20, 30);
      stmt.finalize();
      console.log('Default membership plans seeded successfully.');
    }
  });
}

// Calculate status helper
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

// ================= API ROUTES ================= //

app.get('/api/dashboard/stats', (req, res) => {
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

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    let totalActive = 0, totalExpiring = 0, totalExpired = 0;

    const subscriptionsWithStatus = (rows || []).map((sub) => {
      const status = calculateStatus(sub.end_date);
      if (status === 'Active') totalActive++;
      if (status === 'Expiring Soon') totalExpiring++;
      if (status === 'Expired') totalExpired++;
      return { ...sub, status };
    });

    db.all('SELECT * FROM members ORDER BY id DESC LIMIT 5', [], (err, recentMembers) => {
      if (err) return res.status(500).json({ error: err.message });

      res.json({
        totalMembers: (recentMembers || []).length,
        totalActive,
        totalExpiring,
        totalExpired,
        totalSubscriptions: (rows || []).length,
        recentMembers: recentMembers || [],
        recentSubscriptions: subscriptionsWithStatus.slice(0, 5)
      });
    });
  });
});

app.get('/api/plans', (req, res) => {
  db.all('SELECT * FROM membership_plans ORDER BY id ASC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

app.post('/api/plans', (req, res) => {
  const { name, description, price, duration_days, active } = req.body;
  if (!name || price === undefined || price === null || !duration_days) {
    return res.status(400).json({ error: 'Name, price, and duration are required.' });
  }

  const query = 'INSERT INTO membership_plans (name, description, price, duration_days, active) VALUES (?, ?, ?, ?, ?)';
  db.run(query, [name, description || '', parseFloat(price), parseInt(duration_days), active ? 1 : 0], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, name, description, price, duration_days, active: active ? 1 : 0 });
  });
});

app.put('/api/plans/:id', (req, res) => {
  const { name, description, price, duration_days, active } = req.body;
  const query = 'UPDATE membership_plans SET name = ?, description = ?, price = ?, duration_days = ?, active = ? WHERE id = ?';
  db.run(query, [name, description || '', parseFloat(price), parseInt(duration_days), active ? 1 : 0, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

app.delete('/api/plans/:id', (req, res) => {
  db.run('DELETE FROM membership_plans WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.get('/api/members', (req, res) => {
  const query = `
    SELECT 
      m.*,
      s.id as subscription_id,
      s.start_date,
      s.end_date,
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

  db.all(query, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const members = (rows || []).map((row) => ({
      ...row,
      status: row.end_date ? calculateStatus(row.end_date) : 'No Subscription'
    }));

    res.json(members);
  });
});

app.get('/api/members/:id', (req, res) => {
  db.get('SELECT * FROM members WHERE id = ?', [req.params.id], (err, member) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!member) return res.status(404).json({ error: 'Member not found' });

    const subQuery = `
      SELECT s.*, p.name as plan_name 
      FROM subscriptions s
      JOIN membership_plans p ON s.plan_id = p.id
      WHERE s.member_id = ?
      ORDER BY s.id DESC
    `;
    db.all(subQuery, [req.params.id], (err, subscriptions) => {
      if (err) return res.status(500).json({ error: err.message });

      const history = (subscriptions || []).map((sub) => ({
        ...sub,
        status: calculateStatus(sub.end_date)
      }));

      res.json({
        ...member,
        currentSubscription: history[0] || null,
        history
      });
    });
  });
});

app.post('/api/members', (req, res) => {
  const { full_name, phone, notes, plan_id, start_date } = req.body;
  if (!full_name || !phone) {
    return res.status(400).json({ error: 'Full name and phone number are required.' });
  }

  db.run('INSERT INTO members (full_name, phone, notes) VALUES (?, ?, ?)', [full_name, phone, notes || ''], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    const memberId = this.lastID;

    if (plan_id && start_date) {
      db.get('SELECT * FROM membership_plans WHERE id = ?', [plan_id], (err, plan) => {
        if (err || !plan) {
          return res.json({ id: memberId, full_name, phone, notes });
        }
        
        const start = new Date(start_date);
        const end = new Date(start);
        end.setDate(end.getDate() + plan.duration_days);
        const endDateStr = end.toISOString().split('T')[0];

        db.run(
          'INSERT INTO subscriptions (member_id, plan_id, price, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
          [memberId, plan.id, plan.price, start_date, endDateStr],
          function (subErr) {
            if (subErr) return res.status(500).json({ error: subErr.message });
            res.json({ id: memberId, full_name, phone, subscription_id: this.lastID });
          }
        );
      });
    } else {
      res.json({ id: memberId, full_name, phone, notes });
    }
  });
});

app.put('/api/members/:id', (req, res) => {
  const { full_name, phone, notes } = req.body;
  db.run('UPDATE members SET full_name = ?, phone = ?, notes = ? WHERE id = ?', [full_name, phone, notes || '', req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ updated: this.changes });
  });
});

app.delete('/api/members/:id', (req, res) => {
  db.run('DELETE FROM members WHERE id = ?', [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

app.post('/api/subscriptions', (req, res) => {
  const { member_id, plan_id, start_date } = req.body;
  if (!member_id || !plan_id || !start_date) {
    return res.status(400).json({ error: 'Member, Plan, and Start Date are required.' });
  }

  db.get('SELECT * FROM membership_plans WHERE id = ?', [plan_id], (err, plan) => {
    if (err || !plan) return res.status(404).json({ error: 'Plan not found' });

    const start = new Date(start_date);
    const end = new Date(start);
    end.setDate(end.getDate() + plan.duration_days);
    const endDateStr = end.toISOString().split('T')[0];

    db.run(
      'INSERT INTO subscriptions (member_id, plan_id, price, start_date, end_date) VALUES (?, ?, ?, ?, ?)',
      [member_id, plan_id, plan.price, start_date, endDateStr],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, member_id, plan_id, price: plan.price, start_date, end_date: endDateStr });
      }
    );
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
