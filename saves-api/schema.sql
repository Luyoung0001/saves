-- 分类表
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  category_id INTEGER NOT NULL,
  note TEXT,
  date TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 预设分类数据
INSERT OR IGNORE INTO categories (id, name, icon, type) VALUES
  (1, '工资', '💰', 'income'),
  (2, '奖金', '🎁', 'income'),
  (3, '投资收益', '📈', 'income'),
  (4, '其他收入', '💵', 'income'),
  (5, '餐饮', '🍜', 'expense'),
  (6, '交通', '🚗', 'expense'),
  (7, '购物', '🛒', 'expense'),
  (8, '娱乐', '🎮', 'expense'),
  (9, '居住', '🏠', 'expense'),
  (10, '医疗', '🏥', 'expense'),
  (11, '教育', '📚', 'expense'),
  (12, '其他支出', '📦', 'expense');

-- 索引
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id);
