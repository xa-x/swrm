import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, title: 'Swrm' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)"
        options={{
          headerBackButtonDisplayMode: 'default',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="chat/[id]"
        options={{
          presentation: 'card',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="create"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="broadcast"
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="agent/[id]" options={{ headerShown: false }} />
    </Stack>
  );
}
