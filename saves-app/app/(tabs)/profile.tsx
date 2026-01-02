import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { logout, getStats, getMonthlyStats } from '../../src/api/client';
import { Stats, MonthlyStats } from '../../src/types';
import { formatCurrency, getMonthRange } from '../../src/utils/format';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
  const [username, setUsername] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadData = async () => {
    try {
      // 获取用户名
      const userStr = await AsyncStorage.getItem('saves_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUsername(user.username);
      }

      // 获取统计数据
      const { start, end } = getMonthRange();
      const [statsData, monthlyData] = await Promise.all([
        getStats({ start_date: start, end_date: end }),
        getMonthlyStats(),
      ]);
      setStats(statsData);
      setMonthlyStats(monthlyData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await logout();
    router.replace('/login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // 按分类分组
  const expenseCategories = stats?.by_category.filter((c) => c.type === 'expense') || [];
  const totalExpense = stats?.summary.expense || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 用户信息卡片 */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {username ? username[0].toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.username}>{username}</Text>
      </View>

      {/* 本月概览 */}
      <View style={styles.overviewCard}>
        <Text style={styles.cardTitle}>本月概览</Text>
        <View style={styles.overviewRow}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>收入</Text>
            <Text style={[styles.overviewAmount, { color: '#10B981' }]}>
              {formatCurrency(stats?.summary.income ?? 0)}
            </Text>
            <Text style={styles.overviewCount}>
              {stats?.summary.income_count ?? 0} 笔
            </Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewLabel}>支出</Text>
            <Text style={[styles.overviewAmount, { color: '#EF4444' }]}>
              {formatCurrency(stats?.summary.expense ?? 0)}
            </Text>
            <Text style={styles.overviewCount}>
              {stats?.summary.expense_count ?? 0} 笔
            </Text>
          </View>
        </View>
      </View>

      {/* 支出分类 */}
      {expenseCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>本月支出分类</Text>
          {expenseCategories.slice(0, 5).map((category) => {
            const percentage = totalExpense > 0 ? (category.total / totalExpense) * 100 : 0;
            return (
              <View key={category.id} style={styles.categoryItem}>
                <View style={styles.categoryLeft}>
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <View>
                    <Text style={styles.categoryName}>{category.name}</Text>
                    <Text style={styles.categoryCount}>{category.count} 笔</Text>
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <Text style={styles.categoryAmount}>
                    {formatCurrency(category.total)}
                  </Text>
                  <Text style={styles.categoryPercentage}>
                    {percentage.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* 月度趋势 */}
      {monthlyStats.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>月度趋势</Text>
          {Array.from(new Set(monthlyStats.map((s) => s.month)))
            .slice(0, 6)
            .map((month) => {
              const income = monthlyStats.find(
                (s) => s.month === month && s.type === 'income'
              );
              const expense = monthlyStats.find(
                (s) => s.month === month && s.type === 'expense'
              );
              return (
                <View key={month} style={styles.monthItem}>
                  <Text style={styles.monthLabel}>{month}</Text>
                  <View style={styles.monthAmounts}>
                    <Text style={[styles.monthAmount, { color: '#10B981' }]}>
                      +{formatCurrency(income?.total ?? 0)}
                    </Text>
                    <Text style={[styles.monthAmount, { color: '#EF4444' }]}>
                      -{formatCurrency(expense?.total ?? 0)}
                    </Text>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {/* 退出登录按钮 */}
      <TouchableOpacity
        style={[styles.logoutButton, loggingOut && styles.logoutButtonDisabled]}
        onPress={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? (
          <ActivityIndicator color="#EF4444" />
        ) : (
          <Text style={styles.logoutButtonText}>退出登录</Text>
        )}
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Saves v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  userCard: {
    backgroundColor: '#4F46E5',
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
  },
  username: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewDivider: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E7EB',
  },
  overviewLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  overviewAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 4,
  },
  overviewCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  categoryCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  categoryRight: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  categoryPercentage: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  monthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  monthAmounts: {
    flexDirection: 'row',
    gap: 16,
  },
  monthAmount: {
    fontSize: 14,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
