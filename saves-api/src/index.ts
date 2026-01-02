import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

type Bindings = {
  DB: D1Database;
};

type Variables = {
  user: { id: number; username: string } | null;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// CORS
app.use('*', cors());

// 简单的密码哈希函数 (使用 Web Crypto API)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'saves-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证 token 的中间件
async function authMiddleware(c: any, next: () => Promise<void>) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    c.set('user', null);
    return next();
  }

  const token = authHeader.substring(7);

  try {
    // token 格式: base64(userId:username:hash)
    const decoded = atob(token);
    const [userId, username] = decoded.split(':');

    const user = await c.env.DB.prepare(
      'SELECT id, username FROM users WHERE id = ? AND username = ?'
    ).bind(parseInt(userId), username).first();

    if (user) {
      c.set('user', { id: user.id, username: user.username });
    } else {
      c.set('user', null);
    }
  } catch {
    c.set('user', null);
  }

  return next();
}

// 需要登录的路由保护
function requireAuth(c: any) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: '请先登录' }, 401);
  }
  return null;
}

// 应用认证中间件
app.use('/api/*', authMiddleware);

// 健康检查
app.get('/', (c) => c.json({ status: 'ok', app: 'Saves API' }));

// ========== 用户认证 API ==========

// 注册
const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string().min(6).max(50),
  confirm_password: z.string(),
}).refine(data => data.password === data.confirm_password, {
  message: '两次输入的密码不一致',
  path: ['confirm_password'],
});

app.post('/api/auth/register', zValidator('json', registerSchema), async (c) => {
  const { username, password } = c.req.valid('json');

  // 检查用户名是否已存在
  const existing = await c.env.DB.prepare(
    'SELECT id FROM users WHERE username = ?'
  ).bind(username).first();

  if (existing) {
    return c.json({ error: '用户名已被使用，请选择其他用户名' }, 400);
  }

  // 创建用户
  const passwordHash = await hashPassword(password);
  const result = await c.env.DB.prepare(
    'INSERT INTO users (username, password_hash) VALUES (?, ?) RETURNING id, username, created_at'
  ).bind(username, passwordHash).first();

  // 生成 token
  const token = btoa(`${result!.id}:${result!.username}:${Date.now()}`);

  return c.json({
    message: '注册成功',
    user: {
      id: result!.id,
      username: result!.username,
    },
    token,
  }, 201);
});

// 登录
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

app.post('/api/auth/login', zValidator('json', loginSchema), async (c) => {
  const { username, password } = c.req.valid('json');

  const passwordHash = await hashPassword(password);

  const user = await c.env.DB.prepare(
    'SELECT id, username FROM users WHERE username = ? AND password_hash = ?'
  ).bind(username, passwordHash).first();

  if (!user) {
    return c.json({ error: '用户名或密码错误' }, 401);
  }

  // 生成 token
  const token = btoa(`${user.id}:${user.username}:${Date.now()}`);

  return c.json({
    message: '登录成功',
    user: {
      id: user.id,
      username: user.username,
    },
    token,
  });
});

// 获取当前用户信息
app.get('/api/auth/me', (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: '未登录' }, 401);
  }
  return c.json({ user });
});

// ========== 分类 API ==========

// 获取所有分类
app.get('/api/categories', async (c) => {
  const type = c.req.query('type');
  let query = 'SELECT * FROM categories';
  const params: string[] = [];

  if (type) {
    query += ' WHERE type = ?';
    params.push(type);
  }

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(result.results);
});

// 创建分类
const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().default('📦'),
  type: z.enum(['income', 'expense']),
});

app.post('/api/categories', zValidator('json', createCategorySchema), async (c) => {
  const { name, icon, type } = c.req.valid('json');

  const result = await c.env.DB.prepare(
    'INSERT INTO categories (name, icon, type) VALUES (?, ?, ?) RETURNING *'
  ).bind(name, icon, type).first();

  return c.json(result, 201);
});

// ========== 交易记录 API ==========

// 获取交易记录
app.get('/api/transactions', async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  const user = c.get('user')!;
  const { type, start_date, end_date, limit = '50', offset = '0' } = c.req.query();

  let query = 'SELECT t.*, c.name as category_name, c.icon as category_icon FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.user_id = ?';
  const params: (string | number)[] = [user.id];

  if (type) {
    query += ' AND t.type = ?';
    params.push(type);
  }
  if (start_date) {
    query += ' AND t.date >= ?';
    params.push(start_date);
  }
  if (end_date) {
    query += ' AND t.date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY t.date DESC, t.id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const result = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(result.results);
});

// 创建交易记录
const createTransactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  category_id: z.number().int().positive(),
  note: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

app.post('/api/transactions', zValidator('json', createTransactionSchema), async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  const user = c.get('user')!;
  const { amount, type, category_id, note, date } = c.req.valid('json');

  const result = await c.env.DB.prepare(
    'INSERT INTO transactions (amount, type, category_id, note, date, user_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING *'
  ).bind(amount, type, category_id, note || null, date, user.id).first();

  return c.json(result, 201);
});

// 更新交易记录
app.put('/api/transactions/:id', zValidator('json', createTransactionSchema.partial()), async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  const user = c.get('user')!;
  const id = c.req.param('id');
  const updates = c.req.valid('json');

  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.amount !== undefined) {
    fields.push('amount = ?');
    values.push(updates.amount);
  }
  if (updates.type !== undefined) {
    fields.push('type = ?');
    values.push(updates.type);
  }
  if (updates.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.category_id);
  }
  if (updates.note !== undefined) {
    fields.push('note = ?');
    values.push(updates.note || null);
  }
  if (updates.date !== undefined) {
    fields.push('date = ?');
    values.push(updates.date);
  }

  if (fields.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  values.push(parseInt(id), user.id);

  const result = await c.env.DB.prepare(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id = ? AND user_id = ? RETURNING *`
  ).bind(...values).first();

  if (!result) {
    return c.json({ error: 'Transaction not found' }, 404);
  }

  return c.json(result);
});

// 删除交易记录
app.delete('/api/transactions/:id', async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  const user = c.get('user')!;
  const id = c.req.param('id');

  const result = await c.env.DB.prepare(
    'DELETE FROM transactions WHERE id = ? AND user_id = ? RETURNING id'
  ).bind(parseInt(id), user.id).first();

  if (!result) {
    return c.json({ error: 'Transaction not found' }, 404);
  }

  return c.json({ success: true });
});

// ========== 统计 API ==========

// 获取统计数据
app.get('/api/stats', async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  const user = c.get('user')!;
  const { start_date, end_date } = c.req.query();

  let dateFilter = 'WHERE user_id = ?';
  const params: (string | number)[] = [user.id];

  if (start_date && end_date) {
    dateFilter += ' AND date >= ? AND date <= ?';
    params.push(start_date, end_date);
  }

  // 总收入和支出
  const totals = await c.env.DB.prepare(`
    SELECT
      type,
      SUM(amount) as total,
      COUNT(*) as count
    FROM transactions
    ${dateFilter}
    GROUP BY type
  `).bind(...params).all();

  // 按分类统计
  const byCategory = await c.env.DB.prepare(`
    SELECT
      c.id,
      c.name,
      c.icon,
      c.type,
      SUM(t.amount) as total,
      COUNT(*) as count
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?
    ${start_date && end_date ? 'AND t.date >= ? AND t.date <= ?' : ''}
    GROUP BY c.id
    ORDER BY total DESC
  `).bind(...params).all();

  // 按日期统计（最近30天）
  const daily = await c.env.DB.prepare(`
    SELECT
      date,
      type,
      SUM(amount) as total
    FROM transactions
    WHERE user_id = ? AND date >= date('now', '-30 days')
    GROUP BY date, type
    ORDER BY date DESC
  `).bind(user.id).all();

  const income = totals.results?.find((r: any) => r.type === 'income');
  const expense = totals.results?.find((r: any) => r.type === 'expense');

  return c.json({
    summary: {
      income: income?.total || 0,
      expense: expense?.total || 0,
      balance: (income?.total || 0) - (expense?.total || 0),
      income_count: income?.count || 0,
      expense_count: expense?.count || 0,
    },
    by_category: byCategory.results,
    daily: daily.results,
  });
});

// 月度统计
app.get('/api/stats/monthly', async (c) => {
  const authError = requireAuth(c);
  if (authError) return authError;

  const user = c.get('user')!;

  const result = await c.env.DB.prepare(`
    SELECT
      strftime('%Y-%m', date) as month,
      type,
      SUM(amount) as total,
      COUNT(*) as count
    FROM transactions
    WHERE user_id = ?
    GROUP BY month, type
    ORDER BY month DESC
    LIMIT 24
  `).bind(user.id).all();

  return c.json(result.results);
});

export default app;
