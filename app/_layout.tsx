import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="detection"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Resultados',
            headerStyle: { backgroundColor: '#5D4037' },
            headerTintColor: '#FFFFFF',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
