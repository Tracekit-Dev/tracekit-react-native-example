import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTracekit } from '@tracekit/react-native';

/**
 * Example: Multiple Nested Spans
 *
 * This demonstrates how to create parent-child span relationships
 * similar to the node-apm examples.
 */
export default function MultipleSpansExample() {
  const tracekit = useTracekit();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Simulate a database query (child span)
  const fetchUserFromDB = async (parentSpan: any, userId: string) => {
    // Create a child span
    const dbSpan = tracekit.client?.startSpan('database.query', parentSpan, {
      'db.operation': 'SELECT',
      'db.table': 'users',
      'db.query': `SELECT * FROM users WHERE id = '${userId}'`,
      'user.id': userId,
    });

    // Simulate database delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock user data
    const user = {
      id: userId,
      name: 'John Doe',
      email: 'john@example.com',
    };

    // End the database span
    tracekit.client?.endSpan(dbSpan!, {
      'db.rows_affected': 1,
      'user.found': true,
    });

    return user;
  };

  // Simulate fetching user preferences (child span)
  const fetchUserPreferences = async (parentSpan: any, userId: string) => {
    const prefSpan = tracekit.client?.startSpan('api.fetch_preferences', parentSpan, {
      'http.method': 'GET',
      'http.url': `https://api.example.com/preferences/${userId}`,
      'user.id': userId,
    });

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    const preferences = {
      theme: 'dark',
      notifications: true,
    };

    tracekit.client?.endSpan(prefSpan!, {
      'http.status_code': 200,
      'preferences.count': Object.keys(preferences).length,
    });

    return preferences;
  };

  // Simulate processing payment (child span with error handling)
  const processPayment = async (parentSpan: any, amount: number, shouldFail: boolean) => {
    const paymentSpan = tracekit.client?.startSpan('payment.process', parentSpan, {
      'payment.amount': amount,
      'payment.currency': 'USD',
      'payment.method': 'credit_card',
    });

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 800));

      if (shouldFail) {
        throw new Error('Payment declined: Insufficient funds');
      }

      const paymentId = `pay_${Date.now()}`;

      tracekit.client?.endSpan(paymentSpan!, {
        'payment.id': paymentId,
        'payment.status': 'success',
      }, 'OK');

      return { success: true, paymentId };
    } catch (error) {
      // Record the exception on the span
      paymentSpan!.events.push({
        name: 'exception',
        timestamp: new Date().toISOString(),
        attributes: {
          'exception.type': (error as Error).name,
          'exception.message': (error as Error).message,
        },
      });

      tracekit.client?.endSpan(paymentSpan!, {
        'payment.status': 'failed',
        'error.message': (error as Error).message,
      }, 'ERROR');

      throw error;
    }
  };

  // Main operation with multiple nested spans
  const handleCheckoutFlow = async (shouldFailPayment: boolean = false) => {
    setLoading(true);
    setResult(null);

    try {
      // Create the root span for the entire checkout operation
      const rootSpan = tracekit.client?.startSpan('checkout.flow', null, {
        'checkout.step': 'start',
        'user.id': 'user_123',
      });

      // Step 1: Fetch user data (creates child span)
      const user = await fetchUserFromDB(rootSpan, 'user_123');
      tracekit.addBreadcrumb({
        type: 'info',
        category: 'checkout',
        message: `User data fetched: ${user.name}`,
        level: 'info',
        data: { userId: user.id },
      });

      // Step 2: Fetch user preferences (creates child span)
      const preferences = await fetchUserPreferences(rootSpan, 'user_123');
      tracekit.addBreadcrumb({
        type: 'info',
        category: 'checkout',
        message: 'User preferences loaded',
        level: 'info',
        data: preferences,
      });

      // Step 3: Process payment (creates child span)
      const payment = await processPayment(rootSpan, 99.99, shouldFailPayment);
      tracekit.addBreadcrumb({
        type: 'transaction',
        category: 'payment',
        message: `Payment processed: ${payment.paymentId}`,
        level: 'info',
        data: payment,
      });

      // End the root span successfully
      tracekit.client?.endSpan(rootSpan!, {
        'checkout.step': 'complete',
        'checkout.items_count': 3,
        'checkout.total_amount': 99.99,
        'payment.id': payment.paymentId,
      }, 'OK');

      setResult(`✅ Checkout successful! Payment ID: ${payment.paymentId}`);
      Alert.alert('Success', 'Checkout completed successfully!');

    } catch (error) {
      // Capture the exception
      tracekit.captureException(error as Error, {
        context: 'checkout_flow',
        step: 'payment_processing',
      });

      setResult(`❌ Checkout failed: ${(error as Error).message}`);
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Example: Parallel operations
  const handleParallelOperations = async () => {
    setLoading(true);
    setResult(null);

    try {
      const rootSpan = tracekit.client?.startSpan('parallel.operations', null, {
        'operation.type': 'parallel_fetch',
      });

      // Create multiple child spans that run in parallel
      const operations = await Promise.all([
        (async () => {
          const span1 = tracekit.client?.startSpan('fetch.data1', rootSpan, {
            'data.source': 'api1',
          });
          await new Promise(resolve => setTimeout(resolve, 400));
          tracekit.client?.endSpan(span1!, { 'data.count': 10 });
          return 'Data 1';
        })(),

        (async () => {
          const span2 = tracekit.client?.startSpan('fetch.data2', rootSpan, {
            'data.source': 'api2',
          });
          await new Promise(resolve => setTimeout(resolve, 600));
          tracekit.client?.endSpan(span2!, { 'data.count': 20 });
          return 'Data 2';
        })(),

        (async () => {
          const span3 = tracekit.client?.startSpan('fetch.data3', rootSpan, {
            'data.source': 'api3',
          });
          await new Promise(resolve => setTimeout(resolve, 300));
          tracekit.client?.endSpan(span3!, { 'data.count': 15 });
          return 'Data 3';
        })(),
      ]);

      tracekit.client?.endSpan(rootSpan!, {
        'operations.count': operations.length,
        'operations.results': operations.join(', '),
      });

      setResult(`✅ Parallel operations completed: ${operations.join(', ')}`);
      Alert.alert('Success', 'All parallel operations completed!');

    } catch (error) {
      tracekit.captureException(error as Error);
      setResult(`❌ Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Multiple Spans Example</Text>
        <Text style={styles.subtitle}>
          Demonstrates parent-child span relationships and distributed tracing patterns
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nested Spans (Checkout Flow)</Text>
        <Text style={styles.description}>
          Creates a root span with multiple child spans:
          {'\n'}• Database query span
          {'\n'}• API call span
          {'\n'}• Payment processing span
        </Text>
        <View style={styles.buttonGroup}>
          <Button
            title="Run Successful Checkout"
            onPress={() => handleCheckoutFlow(false)}
            disabled={loading}
          />
          <View style={{ height: 8 }} />
          <Button
            title="Run Failed Checkout"
            onPress={() => handleCheckoutFlow(true)}
            disabled={loading}
            color="#f44336"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parallel Operations</Text>
        <Text style={styles.description}>
          Creates multiple child spans that run concurrently
        </Text>
        <Button
          title="Run Parallel Operations"
          onPress={handleParallelOperations}
          disabled={loading}
          color="#4CAF50"
        />
      </View>

      {loading && (
        <View style={styles.loadingSection}>
          <Text style={styles.loadingText}>⏳ Processing...</Text>
        </View>
      )}

      {result && (
        <View style={styles.resultSection}>
          <Text style={styles.resultTitle}>Result:</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 What's happening?</Text>
        <Text style={styles.infoText}>
          Each operation creates spans with parent-child relationships.
          {'\n\n'}
          Check your TraceKit dashboard to see:
          {'\n'}• Trace timeline showing nested spans
          {'\n'}• Duration of each operation
          {'\n'}• Attributes and events on each span
          {'\n'}• Error spans with exception details
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#673AB7',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#E1BEE7',
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
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  buttonGroup: {
    marginTop: 8,
  },
  loadingSection: {
    backgroundColor: '#FFF9C4',
    padding: 16,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#F57F17',
    fontWeight: '600',
  },
  resultSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 16,
    margin: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
});
