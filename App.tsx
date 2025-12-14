import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, ScrollView, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TracekitProvider, TracekitErrorBoundary, useTracekit, useSpan } from '@tracekit/react-native';
import MultipleSpansExample from './examples/MultipleSpansExample';
import CodeMonitoringExample from './examples/CodeMonitoringExample';

const Stack = createNativeStackNavigator();

// Test Component with various TraceKit features
function TestScreen() {
  const { captureException, captureMessage, setUser, addBreadcrumb } = useTracekit();
  const [counter, setCounter] = useState(0);
  const { start, end, isActive } = useSpan('user-interaction');

  const testErrorTracking = () => {
    try {
      throw new Error('Test error from React Native app');
    } catch (error) {
      captureException(error as Error, {
        component: 'TestScreen',
        action: 'testErrorTracking',
      });
      Alert.alert('Success', 'Error captured! Check your TraceKit dashboard.');
    }
  };

  const testMessageCapture = () => {
    captureMessage('User clicked test message button', 'info', {
      counter,
      timestamp: new Date().toISOString(),
    });
    Alert.alert('Success', 'Message captured!');
  };

  const testUserContext = () => {
    setUser({
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
    });
    Alert.alert('Success', 'User context set!');
  };

  const testBreadcrumbs = () => {
    addBreadcrumb({
      type: 'user',
      category: 'ui.click',
      message: 'User clicked breadcrumb test button',
      level: 'info',
      data: { counter },
    });
    Alert.alert('Success', 'Breadcrumb added!');
  };

  const testSpan = () => {
    if (!isActive) {
      start();
      Alert.alert('Span Started', 'A custom span has been started');
    } else {
      end({ counter });
      Alert.alert('Span Ended', 'The custom span has been completed');
    }
  };

  const testNetworkRequest = async () => {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts/1');
      const data = await response.json();
      Alert.alert('Success', `Fetched post: ${data.title}`);
    } catch (error) {
      captureException(error as Error);
      Alert.alert('Error', 'Failed to fetch data');
    }
  };

  const testCrash = () => {
    // This will be caught by ErrorBoundary
    throw new Error('Intentional crash for testing ErrorBoundary');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TraceKit React Native Test</Text>
        <Text style={styles.subtitle}>Test all TraceKit features</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Counter: {counter}</Text>
        <Button title="Increment" onPress={() => setCounter(c => c + 1)} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Tracking</Text>
        <Button title="Test Error Capture" onPress={testErrorTracking} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Message Capture</Text>
        <Button title="Test Message" onPress={testMessageCapture} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>User Context</Text>
        <Button title="Set User" onPress={testUserContext} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Breadcrumbs</Text>
        <Button title="Add Breadcrumb" onPress={testBreadcrumbs} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Custom Spans</Text>
        <Button
          title={isActive ? "End Span" : "Start Span"}
          onPress={testSpan}
          color={isActive ? "#f44336" : "#4CAF50"}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Monitoring</Text>
        <Button title="Test Fetch" onPress={testNetworkRequest} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Boundary</Text>
        <Button title="Test Crash" onPress={testCrash} color="#f44336" />
      </View>
    </ScrollView>
  );
}

function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error.message}</Text>
      <Button title="Try Again" onPress={resetError} />
    </View>
  );
}

function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>TraceKit Example App</Text>
        <Text style={styles.subtitle}>React Native APM & Error Tracking</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Features</Text>
        <Button
          title="Test All Features"
          onPress={() => navigation.navigate('Test')}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Advanced Examples</Text>
        <Button
          title="Multiple Spans & Nested Traces"
          onPress={() => navigation.navigate('MultipleSpans')}
          color="#673AB7"
        />
        <View style={{ height: 8 }} />
        <Button
          title="Code Monitoring (Snapshots)"
          onPress={() => navigation.navigate('CodeMonitoring')}
          color="#FF5722"
        />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Features:</Text>
        <Text style={styles.infoItem}>✓ Automatic error tracking</Text>
        <Text style={styles.infoItem}>✓ Network request monitoring</Text>
        <Text style={styles.infoItem}>✓ Navigation tracking</Text>
        <Text style={styles.infoItem}>✓ Custom spans & events</Text>
        <Text style={styles.infoItem}>✓ User context</Text>
        <Text style={styles.infoItem}>✓ Breadcrumbs</Text>
        <Text style={styles.infoItem}>✓ Error boundaries</Text>
        <Text style={styles.infoItem}>✓ Code monitoring</Text>
      </View>
    </ScrollView>
  );
}

export default function App() {
  return (
    <TracekitProvider
      config={{
        apiKey: process.env.EXPO_PUBLIC_TRACEKIT_API_KEY || 'ctxio_3f677acd5ee079fb6965a26f11cdb2e65f34bd13ed3723d6dd8a58205ff57afc',
        apiUrl: process.env.EXPO_PUBLIC_TRACEKIT_API_URL || 'http://localhost:8081',
        serviceName: 'react-native-test-app',
        debug: true,
        enableNetworkTracing: true,
        enableNavigationTracing: true,
        enableCrashReporting: true,
        enableCodeMonitoring: true, // Enable code monitoring for snapshots
        flushInterval: 30000, // Flush every 30 seconds for testing (default is 30s)
        maxBatchSize: 50, // (default is 50)
      }}
    >
      <TracekitErrorBoundary fallback={ErrorFallback}>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'TraceKit Demo' }}
            />
            <Stack.Screen
              name="Test"
              component={TestScreen}
              options={{ title: 'Test Features' }}
            />
            <Stack.Screen
              name="MultipleSpans"
              component={MultipleSpansExample}
              options={{ title: 'Multiple Spans' }}
            />
            <Stack.Screen
              name="CodeMonitoring"
              component={CodeMonitoringExample}
              options={{ title: 'Code Monitoring' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </TracekitErrorBoundary>
    </TracekitProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#2196F3',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#e3f2fd',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  infoBox: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2196F3',
  },
  infoItem: {
    fontSize: 14,
    marginBottom: 8,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
});
