import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatScreen from "./screens/ChatScreen";
import AgentThinkingScreen from "./screens/AgentThinkingScreen";
import ProviderResultsScreen from "./screens/ProviderResultsScreen";
import BookingConfirmScreen from "./screens/BookingConfirmScreen";
import AgentTraceScreen from "./screens/AgentTraceScreen";
import AnimatedSplashScreen from "./screens/AnimatedSplashScreen";

const Stack = createNativeStackNavigator();

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0D1525',
  },
};

export default function App() {
  return (
    <NavigationContainer theme={DarkTheme}>
      <Stack.Navigator 
        initialRouteName="Splash"
        screenOptions={{
          headerStyle: { backgroundColor: '#111827' },
          headerTintColor: '#00D4A8',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      >
        <Stack.Screen name="Splash" component={AnimatedSplashScreen} options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="AgentThinking" component={AgentThinkingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ProviderResults" component={ProviderResultsScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} options={{ headerShown: false }} />
        <Stack.Screen name="AgentTrace" component={AgentTraceScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
