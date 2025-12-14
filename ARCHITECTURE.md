# TraceKit React Native SDK - Architecture Documentation

## Overview

The TraceKit React Native SDK provides automatic performance monitoring, error tracking, and code monitoring for React Native applications. It follows OpenTelemetry Protocol (OTLP) standards and works seamlessly with the TraceKit backend.

## How the SDK Works

### 1. Data Collection Flow

```
User Action/Event
      ↓
SDK Captures Data (Span/Exception/Snapshot)
      ↓
Queued in Memory
      ↓
Batching Layer (waits for flush trigger)
      ↓
Convert to OTLP JSON Format
      ↓
HTTP Transport
      ↓
TraceKit Backend (/v1/traces)
```

### 2. Storage Architecture

**IMPORTANT: The SDK uses AsyncStorage, NOT SQLite**

```typescript
// Storage hierarchy
AsyncStorage (or in-memory fallback)
├── Session data (session ID, device ID)
├── User context (user info, tags, extras)
├── Breadcrumbs (last 100 events)
├── Pending data (when offline)
│   ├── Pending spans
│   ├── Pending exceptions
│   └── Pending snapshots
└── Configuration (last flush time, app start time)
```

**Why AsyncStorage?**
- React Native's recommended key-value storage
- Works across iOS, Android, and Web
- Asynchronous, non-blocking
- Falls back to in-memory storage if unavailable
- No native SQLite dependencies needed

**Storage locations:**
- src/storage.ts:92-178 - AsyncStorageWrapper implementation
- src/storage.ts:48-86 - InMemoryStorage fallback
- src/storage.ts:184-397 - StorageManager API

### 3. Batching & Flushing

The SDK doesn't send data immediately - it batches for efficiency:

```typescript
// Default configuration
{
  flushInterval: 30000,  // Auto-flush every 30 seconds
  maxBatchSize: 50,      // Or when 50 items queued
  maxQueueSize: 1000     // Maximum offline queue size
}
```

**Flush triggers:**
1. **Timer-based**: Every `flushInterval` milliseconds (src/transport.ts:53-64)
2. **Size-based**: When queue reaches `maxBatchSize` (src/transport.ts:79-82)
3. **App lifecycle**: When app goes to background (src/client.ts:264-269)
4. **Manual**: Calling `client.flush()` (src/client.ts:812-815)

### 4. OTLP Format Conversion

Before sending, all data is converted to OTLP JSON format:

```typescript
// Custom format → OTLP JSON
{
  resourceSpans: [{
    resource: {
      attributes: [
        { key: 'service.name', value: { stringValue: 'my-app' } },
        { key: 'device.id', value: { stringValue: 'device-123' } },
        // ...
      ]
    },
    scopeSpans: [{
      spans: [{
        traceId: "a1b2c3d4...",  // Hex string (32 chars)
        spanId: "e5f6g7h8...",    // Hex string (16 chars)
        parentSpanId: "...",
        name: "HTTP GET",
        kind: 3,                   // CLIENT
        startTimeUnixNano: "1234567890123456789",
        endTimeUnixNano: "1234567890223456789",
        attributes: [
          { key: 'http.method', value: { stringValue: 'GET' } }
        ],
        status: { code: 1 }        // OK
      }]
    }]
  }]
}
```

**Implementation:** src/transport.ts:205-246

### 5. Network Layer

**HTTP Transport** (src/transport.ts:24-350)
- Sends to `/v1/traces` endpoint
- Headers: `X-API-Key`, `X-SDK`, `X-SDK-Version`
- Handles batching and retry logic
- Converts all payloads to OTLP format

**Offline-Aware Transport** (src/transport.ts:356-446)
- Wraps HttpTransport
- Detects network status using `@react-native-community/netinfo`
- Queues data when offline (up to `maxQueueSize`)
- Auto-flushes when network restored

## Key Components

### 1. TracekitClient (src/client.ts)

The main client managing all SDK operations:

```typescript
class TracekitClient {
  // State
  private transport: Transport
  private storage: StorageManager
  private activeSpans: Map<string, Span>
  private breadcrumbs: Breadcrumb[]

  // Core operations
  startSpan(name, parent?, attrs?) → Span
  endSpan(span, attrs?, status?)
  captureException(error, context?)
  captureMessage(message, level?, context?)
  captureSnapshot(name, data)

  // Context operations
  setUser(user)
  addBreadcrumb(breadcrumb)
  setTag(key, value)
  setContext(name, context)

  // Tracking
  trackScreen(screenName, params?)
  trackNetworkRequest(request)
  recordPerformanceMetrics(metrics)
}
```

**Key methods:**
- `init()` - Initializes SDK (src/client.ts:91-138)
- `startSpan()` - Creates new span (src/client.ts:360-387)
- `endSpan()` - Completes span and sends (src/client.ts:389-411)
- `captureException()` - Captures errors (src/client.ts:445-493)
- `captureSnapshot()` - Code monitoring (src/client.ts:565-601)

### 2. Network Interceptor (src/network.ts)

Automatically traces HTTP requests:

```typescript
class NetworkInterceptor {
  interceptFetch()  // Patches global fetch
  interceptXHR()    // Patches XMLHttpRequest
}
```

**How it works:**
1. Stores original `fetch` and `XMLHttpRequest`
2. Replaces with wrapped versions
3. Wrapped versions:
   - Start a CLIENT span before request
   - Track request/response details
   - End span with success/error status
   - Call original implementation

**Implementation:**
- Fetch interceptor: src/network.ts:82-193
- XHR interceptor: src/network.ts:199-343

### 3. React Integration (src/expo/index.tsx)

Provides React hooks and components:

```typescript
// Provider
<TracekitProvider config={...}>
  <App />
</TracekitProvider>

// Hooks
const tracekit = useTracekit()
const { start, end, isActive } = useSpan('operation-name')

// Error Boundary
<TracekitErrorBoundary fallback={ErrorComponent}>
  <App />
</TracekitErrorBoundary>

// Performance Profiler
<PerformanceProfiler id="my-component">
  <MyComponent />
</PerformanceProfiler>
```

## Data Types

### 1. Traces (Spans)

```typescript
interface Span {
  spanId: string           // 16-char hex string
  traceId: string          // 32-char hex string
  parentSpanId?: string
  name: string
  kind: SpanKind           // INTERNAL, CLIENT, SERVER, etc.
  startTime: string        // ISO 8601
  endTime?: string
  duration?: number        // milliseconds
  status: SpanStatus       // OK, ERROR, UNSET
  attributes: Record<string, any>
  events: SpanEvent[]
  links: SpanLink[]
}
```

**Creating parent-child spans:**
```typescript
// Parent span
const parentSpan = client.startSpan('checkout-flow')

// Child span (linked by parentSpan)
const dbSpan = client.startSpan('database-query', parentSpan)
// ... do work
client.endSpan(dbSpan)

// Another child
const apiSpan = client.startSpan('api-call', parentSpan)
// ... do work
client.endSpan(apiSpan)

// End parent
client.endSpan(parentSpan)
```

### 2. Exceptions

```typescript
interface ExceptionReport {
  type: string             // Error class name
  message: string
  stackTrace?: StackFrame[]
  componentStack?: string  // React component stack
  handled: boolean
  mechanism?: {
    type: string
    handled: boolean
    data?: Record<string, any>
  }
  context?: Record<string, any>
}
```

### 3. Snapshots (Code Monitoring)

```typescript
interface Snapshot {
  id: string
  name: string             // Checkpoint label
  timestamp: string
  data: Record<string, any>  // Captured variables
  stackTrace?: StackFrame[]
  spanContext?: SpanContext  // Associated span
  deviceContext: DeviceContext
}
```

## Comparison with node-apm

The React Native SDK provides **identical APIs** to node-apm:

| Feature | node-apm | react-native | Notes |
|---------|----------|--------------|-------|
| **Initialization** | `tracekit.init({...})` | `<TracekitProvider config={...}>` | React Native uses provider pattern |
| **Manual Spans** | `client.startSpan(...)` | `client.startSpan(...)` | ✅ Same API |
| **Error Tracking** | `client.captureException(...)` | `client.captureException(...)` | ✅ Same API |
| **Code Monitoring** | `client.captureSnapshot(...)` | `client.captureSnapshot(...)` | ✅ Same API |
| **Auto HTTP Tracing** | ✅ http/https/fetch | ✅ fetch/XMLHttpRequest | Different underlying modules |
| **Middleware** | `app.use(tracekit.middleware())` | N/A | React Native has no middleware concept |
| **Storage** | In-memory | AsyncStorage + in-memory | Mobile needs persistence |

### Example Comparison

**node-apm (test-example.js):**
```javascript
app.get('/order', (req, res) => {
  client.captureSnapshot('order-processing', {
    orderId,
    amount: 99.99,
    items: ['item1', 'item2'],
  });

  res.json({ orderId, status: 'processed' });
});
```

**React Native (equivalent):**
```typescript
const handleOrder = async () => {
  await client?.captureSnapshot('order-processing', {
    orderId,
    amount: 99.99,
    items: ['item1', 'item2'],
  });

  // ... process order
};
```

## Performance Characteristics

### Memory Usage

- **Active spans**: Stored in `Map<string, Span>` until completed
- **Breadcrumbs**: Limited to last 100 (FIFO queue)
- **Offline queue**: Up to `maxQueueSize` items (default: 1000)
- **Batching queue**: Up to `maxBatchSize` items (default: 50)

### Network Usage

- **Batching**: Multiple items sent in single request
- **Compression**: OTLP JSON format (compact)
- **Sampling**: Configurable via `sampleRate` (0.0-1.0)
- **Debouncing**: Timer-based flushing prevents excessive requests

### CPU Usage

- **Minimal instrumentation overhead**: < 5% for most operations
- **Async operations**: All storage and network I/O is non-blocking
- **Lazy initialization**: Components loaded on demand

## Configuration Options

```typescript
interface TracekitConfig {
  // Required
  apiKey: string

  // Service identification
  serviceName?: string
  apiUrl?: string           // Base URL (default: https://app.tracekit.dev)
  environment?: string
  appVersion?: string
  buildNumber?: string

  // Features
  enabled?: boolean                    // Default: true
  enableNetworkTracing?: boolean       // Default: true
  enableNavigationTracing?: boolean    // Default: true
  enableCrashReporting?: boolean       // Default: true
  enableCodeMonitoring?: boolean       // Default: false
  enableTouchTracking?: boolean        // Default: false

  // Performance
  sampleRate?: number                  // Default: 1.0 (100%)
  flushInterval?: number               // Default: 30000ms
  maxBatchSize?: number                // Default: 50
  maxQueueSize?: number                // Default: 1000

  // Debugging
  debug?: boolean                      // Default: false

  // Advanced
  customHeaders?: Record<string, string>
  excludeUrls?: (string | RegExp)[]
}
```

## File Structure

```
tracekit-react-native/
├── src/
│   ├── client.ts          # Main TracekitClient class
│   ├── transport.ts       # HTTP/Offline transport layers
│   ├── storage.ts         # AsyncStorage wrapper & manager
│   ├── network.ts         # fetch/XHR interceptors
│   ├── types.ts           # TypeScript definitions
│   ├── utils.ts           # Helper functions
│   ├── components.tsx     # React components (ErrorBoundary, Profiler)
│   ├── expo/
│   │   └── index.tsx      # Expo-specific integrations & hooks
│   └── index.ts           # Main export
└── package.json

react-native-test/
├── App.tsx                # Main test app
├── examples/
│   ├── MultipleSpansExample.tsx      # Nested spans demo
│   └── CodeMonitoringExample.tsx     # Snapshot demo
└── README.md
```

## Common Patterns

### 1. Creating Nested Spans

```typescript
// Root operation
const rootSpan = client.startSpan('checkout-flow', null, {
  'user.id': userId,
  'checkout.step': 'start',
});

// Child operations
const dbSpan = client.startSpan('database.query', rootSpan, {
  'db.operation': 'SELECT',
  'db.table': 'users',
});
await fetchUser();
client.endSpan(dbSpan);

const paymentSpan = client.startSpan('payment.process', rootSpan, {
  'payment.amount': 99.99,
});
await processPayment();
client.endSpan(paymentSpan);

// Complete root
client.endSpan(rootSpan, { 'checkout.step': 'complete' });
```

### 2. Error Tracking with Context

```typescript
try {
  await riskyOperation();
} catch (error) {
  client.captureException(error, {
    context: 'checkout_flow',
    step: 'payment',
    userId: user.id,
    amount: cart.total,
  });
  throw error;
}
```

### 3. Code Monitoring Checkpoints

```typescript
// Before critical operation
await client.captureSnapshot('payment-start', {
  orderId,
  amount,
  paymentMethod,
});

const result = await processPayment();

// After critical operation
await client.captureSnapshot('payment-complete', {
  orderId,
  paymentId: result.id,
  status: result.status,
});
```

### 4. Parallel Operations

```typescript
const rootSpan = client.startSpan('parallel-operations');

await Promise.all([
  (async () => {
    const span1 = client.startSpan('operation-1', rootSpan);
    await doWork1();
    client.endSpan(span1);
  })(),

  (async () => {
    const span2 = client.startSpan('operation-2', rootSpan);
    await doWork2();
    client.endSpan(span2);
  })(),
]);

client.endSpan(rootSpan);
```

## Troubleshooting

### Traces not appearing in dashboard

1. **Check configuration:**
   ```typescript
   config={{
     apiKey: 'your-key',
     apiUrl: 'http://localhost:8081',  // Verify URL
     debug: true,  // Enable debug logging
   }}
   ```

2. **Check console logs:**
   - Look for `[TraceKit]` prefix
   - Verify "Flushing X items" messages
   - Check for HTTP errors

3. **Check batching:**
   - Default flush: 30 seconds OR 50 items
   - For testing, use smaller values:
     ```typescript
     flushInterval: 5000,   // 5 seconds
     maxBatchSize: 10,      // 10 items
     ```

4. **Force flush:**
   ```typescript
   await client.flush();
   ```

### AsyncStorage errors

If you see "AsyncStorage not found" warnings:

1. **Install dependency:**
   ```bash
   npm install @react-native-async-storage/async-storage
   ```

2. **Or use in-memory fallback:**
   - SDK automatically falls back to in-memory storage
   - Data won't persist between app restarts

### Network requests not traced

1. **Check URL exclusions:**
   ```typescript
   excludeUrls: [/tracekit\.dev/]  // Excludes TraceKit API
   ```

2. **Verify interceptors installed:**
   - Check for "Installing network interceptor" in debug logs

3. **Supported clients:**
   - ✅ fetch (global)
   - ✅ XMLHttpRequest
   - ❌ Native modules (not automatically traced)

## Best Practices

1. **Use descriptive span names:** `database.query` not `query`
2. **Add relevant attributes:** Include IDs, counts, types
3. **Limit breadcrumbs:** Auto-limited to 100, but be mindful
4. **Sample in production:** Use `sampleRate` to reduce volume
5. **Exclude sensitive URLs:** Use `excludeUrls` for auth endpoints
6. **Test with debug mode:** Enable `debug: true` during development
7. **Monitor offline queue:** Check storage if seeing memory issues

## References

- OpenTelemetry Protocol: https://opentelemetry.io/docs/specs/otlp/
- React Native AsyncStorage: https://react-native-async-storage.github.io/async-storage/
- TraceKit Documentation: https://app.tracekit.dev/docs
