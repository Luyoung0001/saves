export interface User {
  id: number;
  username: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  created_at?: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  category_id: number;
  category_name?: string;
  category_icon?: string;
  note?: string;
  date: string;
  created_at?: string;
}

export interface Stats {
  summary: {
    income: number;
    expense: number;
    balance: number;
    income_count: number;
    expense_count: number;
  };
  by_category: Array<{
    id: number;
    name: string;
    icon: string;
    type: string;
    total: number;
    count: number;
  }>;
  daily: Array<{
    date: string;
    type: string;
    total: number;
  }>;
}

export interface MonthlyStats {
  month: string;
  type: string;
  total: number;
  count: number;
}
