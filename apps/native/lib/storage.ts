import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Secure storage for sensitive data (API keys)
export const secureStorage = {
  async saveApiKey(provider: string, key: string) {
    await SecureStore.setItemAsync(`api_key_${provider}`, key);
  },

  async getApiKey(provider: string): Promise<string | null> {
    return SecureStore.getItemAsync(`api_key_${provider}`);
  },

  async deleteApiKey(provider: string) {
    await SecureStore.deleteItemAsync(`api_key_${provider}`);
  },

  async getAllApiKeys(): Promise<Record<string, string>> {
    // SecureStore doesn't support listing, so we track providers separately
    const providers = await AsyncStorage.getItem('api_key_providers');
    const providerList: string[] = providers ? JSON.parse(providers) : [];
    
    const keys: Record<string, string> = {};
    for (const provider of providerList) {
      const key = await this.getApiKey(provider);
      if (key) keys[provider] = key;
    }
    
    return keys;
  },

  async trackProvider(provider: string) {
    const providers = await AsyncStorage.getItem('api_key_providers');
    const list: string[] = providers ? JSON.parse(providers) : [];
    if (!list.includes(provider)) {
      list.push(provider);
      await AsyncStorage.setItem('api_key_providers', JSON.stringify(list));
    }
  },
};

// General storage for non-sensitive data
export const storage = {
  async get<T>(key: string): Promise<T | null> {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  },

  async set<T>(key: string, value: T): Promise<void> {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  },

  async remove(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
};

// User preferences
export const userPrefs = {
  async setUserId(id: string) {
    await AsyncStorage.setItem('user_id', id);
  },

  async getUserId(): Promise<string | null> {
    return AsyncStorage.getItem('user_id');
  },

  async setHasAgents(value: boolean) {
    await AsyncStorage.setItem('has_agents', JSON.stringify(value));
  },

  async hasAgents(): Promise<boolean> {
    const value = await AsyncStorage.getItem('has_agents');
    return value === 'true';
  },

  async setOnboardingComplete(value: boolean) {
    await AsyncStorage.setItem('onboarding_complete', JSON.stringify(value));
  },

  async isOnboardingComplete(): Promise<boolean> {
    const value = await AsyncStorage.getItem('onboarding_complete');
    return value === 'true';
  },
};
