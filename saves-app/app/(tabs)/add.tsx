import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { getCategories, createTransaction } from '../../src/api/client';
import { Category } from '../../src/types';
import { getToday } from '../../src/utils/format';

export default function AddScreen() {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getToday());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState('');
  const [successType, setSuccessType] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    loadCategories();
  }, [type]);

  const loadCategories = async () => {
    try {
      const data = await getCategories(type);
      setCategories(data);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('提示', '请输入有效金额');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('提示', '请选择分类');
      return;
    }

    setSubmitting(true);
    try {
      await createTransaction({
        amount: parseFloat(amount),
        type,
        category_id: selectedCategory,
        note: note || undefined,
        date,
      });
      // 显示成功提示
      setSuccessAmount(amount);
      setSuccessType(type);
      setShowSuccess(true);
      // 重置表单
      resetForm();
      // 3秒后隐藏成功提示
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error: any) {
      Alert.alert('错误', error.message || '记账失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setSelectedCategory(null);
    setNote('');
    setDate(getToday());
  };

  return (
    <View style={styles.wrapper}>
      {/* 成功提示 */}
      {showSuccess && (
        <View style={[
          styles.successToast,
          { backgroundColor: successType === 'income' ? '#10B981' : '#EF4444' }
        ]}>
          <Text style={styles.successIcon}>✓</Text>
          <Text style={styles.successText}>
            记账成功！{successType === 'income' ? '收入' : '支出'} ¥{successAmount}
          </Text>
        </View>
      )}

      <ScrollView style={styles.container}>
      {/* 类型切换 */}
      <View style={styles.typeContainer}>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'expense' && styles.typeButtonActive,
          ]}
          onPress={() => setType('expense')}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === 'expense' && styles.typeButtonTextActive,
            ]}
          >
            支出
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.typeButton,
            type === 'income' && styles.typeButtonActiveIncome,
          ]}
          onPress={() => setType('income')}
        >
          <Text
            style={[
              styles.typeButtonText,
              type === 'income' && styles.typeButtonTextActive,
            ]}
          >
            收入
          </Text>
        </TouchableOpacity>
      </View>

      {/* 金额输入 */}
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>¥</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* 分类选择 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>选择分类</Text>
        {loading ? (
          <ActivityIndicator size="small" color="#4F46E5" />
        ) : (
          <View style={styles.categoryGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryItem,
                  selectedCategory === category.id && styles.categoryItemActive,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text
                  style={[
                    styles.categoryName,
                    selectedCategory === category.id && styles.categoryNameActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* 日期 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>日期</Text>
        <TextInput
          style={styles.input}
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
        />
      </View>

      {/* 备注 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>备注</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="添加备注（可选）"
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* 提交按钮 */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          type === 'income' && styles.submitButtonIncome,
          submitting && styles.submitButtonDisabled,
        ]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.submitButtonText}>保存</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  successIcon: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  successText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  typeContainer: {
    flexDirection: 'row',
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeButtonActive: {
    backgroundColor: '#EF4444',
  },
  typeButtonActiveIncome: {
    backgroundColor: '#10B981',
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
  },
  currencySymbol: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  section: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  categoryItem: {
    width: '25%',
    padding: 4,
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryItemActive: {
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  categoryIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoryNameActive: {
    color: '#4F46E5',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    backgroundColor: '#EF4444',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonIncome: {
    backgroundColor: '#10B981',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
