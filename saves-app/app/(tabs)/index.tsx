import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getStats, getTransactions } from '../../src/api/client';
import { Stats, Transaction } from '../../src/types';
import { formatCurrency, formatDateShort, getMonthRange } from '../../src/utils/format';

export default function HomeScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const { start, end } = getMonthRange();
      const [statsData, transactionsData] = await Promise.all([
        getStats({ start_date: start, end_date: end }),
        getTransactions({ limit: 10 }),
      ]);
      setStats(statsData);
      setTransactions(transactionsData);
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 概览卡片 */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>本月概览</Text>
        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>结余</Text>
          <Text style={[
            styles.balanceAmount,
            { color: (stats?.summary.balance ?? 0) >= 0 ? '#10B981' : '#EF4444' }
          ]}>
            {formatCurrency(stats?.summary.balance ?? 0)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>收入</Text>
            <Text style={[styles.summaryItemAmount, { color: '#10B981' }]}>
              +{formatCurrency(stats?.summary.income ?? 0)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryItemLabel}>支出</Text>
            <Text style={[styles.summaryItemAmount, { color: '#EF4444' }]}>
              -{formatCurrency(stats?.summary.expense ?? 0)}
            </Text>
          </View>
        </View>
      </View>

      {/* 最近交易 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>最近交易</Text>
        {transactions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>暂无交易记录</Text>
            <Text style={styles.emptySubtext}>点击下方 + 开始记账</Text>
          </View>
        ) : (
          transactions.map((transaction) => (
            <View key={transaction.id} style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <Text style={styles.transactionIcon}>
                  {transaction.category_icon}
                </Text>
                <View>
                  <Text style={styles.transactionCategory}>
                    {transaction.category_name}
                  </Text>
                  <Text style={styles.transactionDate}>
                    {formatDateShort(transaction.date)}
                    {transaction.note ? ` · ${transaction.note}` : ''}
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: transaction.type === 'income' ? '#10B981' : '#EF4444' },
                ]}
              >
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(transaction.amount)}
              </Text>
            </View>
          ))
        )}
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
  summaryCard: {
    backgroundColor: '#4F46E5',
    margin: 16,
    borderRadius: 16,
    padding: 20,
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.8,
  },
  balanceContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  balanceLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.7,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  summaryItemLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.7,
  },
  summaryItemAmount: {
    fontSize: 18,
    fontWeight: '600',
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
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
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  transactionCategory: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  transactionDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
});
