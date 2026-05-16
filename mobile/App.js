import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ChatScreen from "./screens/ChatScreen";
import AgentThinkingScreen from "./screens/AgentThinkingScreen";
import ProviderResultsScreen from "./screens/ProviderResultsScreen";
import BookingConfirmScreen from "./screens/BookingConfirmScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Chat">
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "KhidmatAI" }} />
        <Stack.Screen name="AgentThinking" component={AgentThinkingScreen} options={{ title: "Finding providers..." }} />
        <Stack.Screen name="ProviderResults" component={ProviderResultsScreen} options={{ title: "Providers" }} />
        <Stack.Screen name="BookingConfirm" component={BookingConfirmScreen} options={{ title: "Booking Confirmed" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
