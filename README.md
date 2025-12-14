# TraceKit React Native Test & Example App

This is a comprehensive test and example application for the TraceKit React Native SDK. It demonstrates all major features and serves as both a testing harness and reference implementation.

## Features Demonstrated

- ✅ **Error Tracking** - Capture and report exceptions
- ✅ **Message Capture** - Log custom messages with context
- ✅ **User Context** - Set and track user information
- ✅ **Breadcrumbs** - Track user interactions and events
- ✅ **Custom Spans** - Create custom performance spans
- ✅ **Network Monitoring** - Automatic tracking of fetch requests
- ✅ **Navigation Tracking** - Automatic screen view tracking
- ✅ **Error Boundaries** - React error boundary integration

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure API key** (optional):
   ```bash
   cp .env.example .env
   # Edit .env and add your TraceKit API key
   ```

3. **Run the app:**

   **iOS:**
   ```bash
   npm run ios
   ```

   **Android:**
   ```bash
   npm run android
   ```

   **Web:**
   ```bash
   npm run web
   ```

## Project Structure

```
react-native-test/
├── App.tsx              # Main app with all test scenarios
├── package.json         # Dependencies and scripts
└── .env.example         # Environment variables template
```

## Testing Features

### Home Screen
- Overview of TraceKit features
- Navigation to test screen

### Test Screen
The test screen provides buttons to test each TraceKit feature:

1. **Error Tracking** - Throws and captures a test error
2. **Message Capture** - Sends a custom message with metadata
3. **User Context** - Sets user identification
4. **Breadcrumbs** - Adds a breadcrumb trail entry
5. **Custom Spans** - Start/end custom performance spans
6. **Network Monitoring** - Makes a test API call (automatically tracked)
7. **Error Boundary** - Tests React error boundary integration

## Using as an Example

This app demonstrates best practices for integrating TraceKit:

### Basic Setup
```typescript
import { TracekitProvider, TracekitErrorBoundary } from '@tracekit/react-native';

<TracekitProvider
  config={{
    apiKey: 'your-api-key',
    serviceName: 'your-app-name',
    debug: true,
  }}
>
  <TracekitErrorBoundary>
    <App />
  </TracekitErrorBoundary>
</TracekitProvider>
```

### Using Hooks
```typescript
import { useTracekit, useSpan } from '@tracekit/react-native';

function MyComponent() {
  const { captureException, setUser } = useTracekit();
  const { start, end } = useSpan('my-operation');

  // Use TraceKit features...
}
```

## Development

To modify and test the TraceKit package locally:

1. Make changes to `../tracekit-react-native`
2. Rebuild the package: `cd ../tracekit-react-native && npm run build`
3. Reinstall in test app: `npm install ../tracekit-react-native`
4. Restart the development server

## Notes

- The app works without an API key (using 'test-api-key' as default)
- In production, always use a real API key from https://app.tracekit.dev
- Debug mode is enabled to see console logs
- All features are interactive and provide visual feedback

## Troubleshooting

### Module not found errors
```bash
npm install
```

### Cache issues
```bash
npx expo start --clear
```

### iOS build issues
```bash
cd ios && pod install && cd ..
```

## License

MIT - Same as TraceKit package
