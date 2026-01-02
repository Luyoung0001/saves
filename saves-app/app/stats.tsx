import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getStats, getMonthlyStats } from '../src/api/client';
import { Stats, MonthlyStats } from '../src/types';
import { formatCurrency, getMonthRange } from '../src/utils/format';

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const { start, end } = getMonthRange();
      const [statsData, monthlyData] = await Promise.all([
        getStats({ start_date: start, end_date: end }),
        getMonthlyStats(),
      ]);
      setStats(statsData);
      setMonthlyStats(monthlyData);
    } catch (error) {
      console.error('Failed to load stats:', error);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  // 按分类分组
  const expenseCategories = stats?.by_category.filter((c) => c.type === 'expense') || [];
  const incomeCategories = stats?.by_category.filter((c) => c.type === 'income') || [];

  // 计算支出占比
  const totalExpense = stats?.summary.expense || 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
          <Text style={styles.sectionTitle}>支出分类</Text>
          {expenseCategories.map((category) => {
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

      {/* 收入分类 */}
      {incomeCategories.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>收入分类</Text>
          {incomeCategories.map((category) => (
            <View key={category.id} style={styles.categoryItem}>
              <View style={styles.categoryLeft}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <View>
                  <Text style={styles.categoryName}>{category.name}</Text>
                  <Text style={styles.categoryCount}>{category.count} 笔</Text>
                </View>
              </View>
              <Text style={[styles.categoryAmount, { color: '#10B981' }]}>
                {formatCurrency(category.total)}
              </Text>
            </View>
          ))}
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

      {/* 空状态 */}
      {expenseCategories.length === 0 && incomeCategories.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>暂无统计数据</Text>
          <Text style={styles.emptySubtext}>开始记账后这里会显示统计信息</Text>
        </View>
      )}
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
  overviewCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
});
