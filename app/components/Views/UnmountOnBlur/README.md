# UnmountOnBlur Component

A React component that conditionally renders its children based on whether the current screen is focused or not. This component uses React Navigation's `useIsFocused` hook to determine the screen's focus state.

## Purpose

The `UnmountOnBlur` component is designed to optimize performance by unmounting heavy components when they are not visible, or to prevent background operations when the screen is not active. This is particularly useful in React Native applications where screens can lose focus but remain mounted in memory.

## Features

- **Automatic unmounting**: Children are unmounted when the screen loses focus
- **Optional fallback**: Display alternative content when unfocused
- **TypeScript support**: Fully typed with comprehensive interfaces
- **Performance optimization**: Prevents unnecessary renders and background operations
- **Navigation integration**: Works seamlessly with React Navigation

## Installation

This component is already included in the MetaMask Mobile app. Simply import it from the Views folder:

```typescript
import UnmountOnBlur from '../Views/UnmountOnBlur';
```

## API

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | `React.ReactNode` | Yes | - | The content to render when the screen is focused |
| `fallback` | `React.ReactNode` | No | `null` | Optional content to render when screen is not focused |

### Interface

```typescript
interface UnmountOnBlurProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

## Usage Examples

### Basic Usage

```typescript
import React from 'react';
import { View, Text } from 'react-native';
import UnmountOnBlur from '../UnmountOnBlur';

const MyScreen = () => (
  <View>
    <Text>This content always renders</Text>
    <UnmountOnBlur>
      <ExpensiveComponent />
    </UnmountOnBlur>
  </View>
);
```

### With Fallback Content

```typescript
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import UnmountOnBlur from '../UnmountOnBlur';

const MyScreen = () => (
  <View>
    <UnmountOnBlur 
      fallback={<ActivityIndicator size="small" />}
    >
      <VideoPlayer />
    </UnmountOnBlur>
  </View>
);
```

### Wrapping Multiple Components

```typescript
import React from 'react';
import { View } from 'react-native';
import UnmountOnBlur from '../UnmountOnBlur';

const MyScreen = () => (
  <View>
    <UnmountOnBlur>
      <ChatComponent />
      <NotificationListener />
      <LocationTracker />
    </UnmountOnBlur>
  </View>
);
```

## Use Cases

### 1. Performance Optimization
Use `UnmountOnBlur` to unmount heavy components that consume significant resources:
- WebViews
- Maps
- Video players
- Charts and graphs
- Animation components

### 2. Background Operations
Prevent unnecessary background operations when the screen is not visible:
- API polling
- WebSocket connections
- Real-time data subscriptions
- Location tracking

### 3. Media Components
Pause or stop media playback when the screen loses focus:
- Audio/video players
- Camera components
- Animation loops

### 4. Network Operations
Reduce network usage by stopping data fetching when not needed:
- Chat components
- Live feeds
- Real-time notifications

## Performance Benefits

1. **Memory optimization**: Unmounted components free up memory
2. **CPU reduction**: Prevents unnecessary re-renders and calculations
3. **Network savings**: Stops background API calls and data fetching
4. **Battery life**: Reduces background processing
5. **Smoother navigation**: Less competition for resources during screen transitions

## When Not to Use

- For lightweight components that don't impact performance
- When you need to maintain component state across focus changes
- For components that must continue running in the background
- When the unmounting/mounting cost exceeds the performance benefit

## Testing

The component includes comprehensive tests covering:
- Rendering children when focused
- Unmounting children when not focused
- Fallback content display
- Focus state changes
- Complex component hierarchies

Run tests with:
```bash
npm test UnmountOnBlur
```

## Implementation Notes

- Uses React Navigation's `useIsFocused` hook
- Follows MetaMask Mobile's TypeScript patterns
- Includes proper JSDoc documentation
- Supports React Native's component lifecycle
- Compatible with React Testing Library

## Related Components

- React Navigation's focus management
- MetaMask's performance optimization utilities
- Background task management components 