import React, { useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet, TextInput, Alert } from 'react-native';
import { useTracekit } from '@tracekit/react-native';

/**
 * Example: Code Monitoring (Snapshots)
 *
 * Similar to node-apm's captureSnapshot feature.
 * This allows you to capture variable state at specific points in your code.
 */
export default function CodeMonitoringExample() {
  const { client } = useTracekit();
  const [orderId, setOrderId] = useState('');
  const [cartItems, setCartItems] = useState(3);
  const [totalAmount, setTotalAmount] = useState(149.99);

  const handleCheckoutValidation = async () => {
    // Capture snapshot at validation point
    await client?.captureSnapshot('checkout-validation', {
      orderId,
      cartItems,
      totalAmount,
      timestamp: new Date().toISOString(),
      step: 'validation',
    });

    Alert.alert(
      'Snapshot Captured',
      'checkout-validation snapshot has been sent to TraceKit'
    );
  };

  const handlePaymentProcessing = async () => {
    // Simulate payment processing with snapshots
    const paymentData = {
      orderId: orderId || `order_${Date.now()}`,
      amount: totalAmount,
      currency: 'USD',
      method: 'credit_card',
    };

    // Snapshot before payment
    await client?.captureSnapshot('payment-start', {
      ...paymentData,
      step: 'before_payment',
      cardLast4: '4242',
    });

    // Simulate payment delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Snapshot after payment
    const paymentResult = {
      paymentId: `pay_${Date.now()}`,
      status: 'success',
      transactionId: `txn_${Date.now()}`,
    };

    await client?.captureSnapshot('payment-complete', {
      ...paymentData,
      ...paymentResult,
      step: 'after_payment',
      processingTime: 1500,
    });

    Alert.alert(
      'Snapshots Captured',
      'payment-start and payment-complete snapshots sent'
    );
  };

  const handleErrorScenario = async () => {
    try {
      // Snapshot before error
      await client?.captureSnapshot('error-scenario-start', {
        orderId,
        step: 'before_error',
        items: cartItems,
      });

      // Simulate an error
      if (totalAmount < 10) {
        throw new Error('Order total too low');
      }

      // This would not be reached
      await client?.captureSnapshot('error-scenario-success', {
        orderId,
        step: 'no_error',
      });

    } catch (error) {
      // Capture snapshot on error
      await client?.captureSnapshot('error-scenario-caught', {
        orderId,
        step: 'error_caught',
        error: (error as Error).message,
        stackTrace: (error as Error).stack,
      });

      Alert.alert('Error Captured', (error as Error).message);
    }
  };

  // Example: Snapshot in a loop (like processing multiple items)
  const handleBatchProcessing = async () => {
    const items = [
      { id: 'item1', name: 'Widget A', price: 29.99 },
      { id: 'item2', name: 'Widget B', price: 49.99 },
      { id: 'item3', name: 'Widget C', price: 69.99 },
    ];

    for (const item of items) {
      await client?.captureSnapshot(`process-item-${item.id}`, {
        itemId: item.id,
        itemName: item.name,
        price: item.price,
        processedAt: new Date().toISOString(),
      });

      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    Alert.alert(
      'Batch Snapshots Captured',
      `Captured snapshots for ${items.length} items`
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Code Monitoring Example</Text>
        <Text style={styles.subtitle}>
          Capture variable state at specific points in your code
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Order Details</Text>
        <TextInput
          style={styles.input}
          placeholder="Order ID (optional)"
          value={orderId}
          onChangeText={setOrderId}
        />
        <TextInput
          style={styles.input}
          placeholder="Cart Items"
          value={String(cartItems)}
          onChangeText={(text) => setCartItems(parseInt(text) || 0)}
          keyboardType="numeric"
        />
        <TextInput
          style={styles.input}
          placeholder="Total Amount"
          value={String(totalAmount)}
          onChangeText={(text) => setTotalAmount(parseFloat(text) || 0)}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Single Snapshots</Text>
        <Text style={styles.description}>
          Capture variable state at a specific point
        </Text>
        <Button
          title="Capture Checkout Validation"
          onPress={handleCheckoutValidation}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Multiple Snapshots</Text>
        <Text style={styles.description}>
          Capture before/after states in a process
        </Text>
        <Button
          title="Process Payment (with snapshots)"
          onPress={handlePaymentProcessing}
          color="#4CAF50"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Error Scenario</Text>
        <Text style={styles.description}>
          Capture snapshots in error handling
        </Text>
        <Button
          title="Test Error Snapshot"
          onPress={handleErrorScenario}
          color="#FF9800"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Batch Processing</Text>
        <Text style={styles.description}>
          Capture snapshots for multiple items
        </Text>
        <Button
          title="Process Multiple Items"
          onPress={handleBatchProcessing}
          color="#9C27B0"
        />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>💡 How Code Monitoring Works</Text>
        <Text style={styles.infoText}>
          Snapshots capture:
          {'\n'}• Variable values at capture point
          {'\n'}• Stack trace showing where snapshot was taken
          {'\n'}• Timestamp
          {'\n'}• Associated span context (if in a traced request)
          {'\n\n'}
          Unlike breakpoints in a debugger:
          {'\n'}• Production-safe (no performance impact)
          {'\n'}• Captured data is sent to TraceKit
          {'\n'}• Can be enabled/disabled remotely
          {'\n'}• No need to redeploy
        </Text>
      </View>

      <View style={styles.comparisonBox}>
        <Text style={styles.comparisonTitle}>📊 Comparison with node-apm</Text>
        <Text style={styles.comparisonText}>
          <Text style={{ fontWeight: 'bold' }}>node-apm example:</Text>
          {'\n'}
          client.captureSnapshot('checkout-validation', {'{'}
          {'\n'}  userId, cartItems, totalAmount
          {'\n'}{'}'});
          {'\n\n'}
          <Text style={{ fontWeight: 'bold' }}>React Native equivalent:</Text>
          {'\n'}
          client?.captureSnapshot('checkout-validation', {'{'}
          {'\n'}  userId, cartItems, totalAmount
          {'\n'}{'}'});
          {'\n\n'}
          ✅ Same API, same behavior!
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
    backgroundColor: '#FF5722',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#FFCCBC',
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
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    margin: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#E65100',
  },
  infoText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  comparisonBox: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    margin: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  comparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2E7D32',
  },
  comparisonText: {
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 20,
    fontFamily: 'monospace',
  },
});
