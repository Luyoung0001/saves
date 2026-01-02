import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { getToken } from '../src/api/client';

export default function IndexScreen() {
  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace('/(tabs)');
    } else {
      router.replace('/login');
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
      <ActivityIndicator size="large" color="#4F46E5" />
    </View>
  );
}
