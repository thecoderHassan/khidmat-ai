import React from "react";
import { View, Text, StyleSheet } from "react-native";

/**
 * ProviderResultsScreen
 * TODO: implement UI for this screen
 * Author: [Team Member — assign here]
 */
export default function ProviderResultsScreen({ navigation, route }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>ProviderResultsScreen — Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  text: { fontSize: 16, color: "#666" },
});
