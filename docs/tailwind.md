# Tailwind CSS / TWRNC Get Started Guide

A comprehensive guide to get up and running with Tailwind CSS and TWRNC (Tailwind React Native Classnames) in MetaMask Mobile.

## Table of Contents

1. [Overview](#overview)
2. [VS Code Setup](#vs-code-setup)
3. [Understanding the Architecture](#understanding-the-architecture)
4. [Using Tailwind Classes](#using-tailwind-classes)
5. [Using the useTailwind Hook](#using-the-usetailwind-hook)
6. [Best Practices](#best-practices)
7. [Getting Help](#getting-help)

## Overview

MetaMask Mobile uses a custom implementation of Tailwind CSS specifically designed for React Native through the TWRNC (Tailwind React Native Classnames) system. This allows developers to use utility-first CSS classes directly in React Native components while maintaining consistency with the MetaMask design system.

## VS Code Setup

### 1. Install Recommended Extensions

Install the **Tailwind CSS IntelliSense** extension for VS Code:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Tailwind CSS IntelliSense"
4. Install the extension by Tailwind Labs

## Understanding the Architecture

### Configuration Files

The project uses two main configuration files:

1. **`tailwind.config.js`** - Used for tooling only (VS Code IntelliSense and ESLint)
2. **`@metamask/design-system-twrnc-preset`** - Contains the actual Tailwind classes and design tokens

### Key Points

- The `tailwind.config.js` file is **for tooling only** and doesn't affect runtime behavior
- Actual Tailwind classes are provided by the `@metamask/design-system-twrnc-preset` package
- Design tokens are automatically synced with MetaMask's design system
- The system supports both light and dark themes

## Using Tailwind Classes

### 1. Using the `twClassName` Prop

The `twClassName` prop is available on all design system components:

```tsx
import { Box, Text } from '@metamask/design-system-react-native';

const MyComponent = () => (
  <Box twClassName="relative">
    <Text twClassName="absolute p-4 top-4">Hello World</Text>
  </Box>
);
```

### 2. Using with Standard React Native Components

For standard React Native components, use the `useTailwind` hook:

```tsx
import { View, Text } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const MyComponent = () => {
  const tw = useTailwind();

  return (
    <ScrollView style={tw`flex-1 bg-default`}>
      <Text>Hello World</Text>
    </ScrollView>
  );
};
```

## Using the useTailwind Hook

The `useTailwind` hook provides access to the Tailwind class processor:

```tsx
import { ScrollView, Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

const WalletHome: React.FC = () => {
  const tw = useTailwind();

  return (
    <ScrollView style={tw`flex-1 bg-default`}>
      <Pressable
        style={({ pressed }) =>
          tw.style(
            'w-full flex-row items-center justify-between px-4 py-2',
            pressed && 'bg-pressed',
          )
        }
      >
        {/* Content */}
      </Pressable>
    </ScrollView>
  );
};
```

### Advanced Usage with Conditional Styles

```tsx
const tw = useTailwind();

// Using tw.style() for complex conditions
const complexStyle = tw.style(
  'text-default',
  isActive && 'text-primary-default',
  isDisabled && 'opacity-50',
  { 'text-error-default': someCondition },
);
```

## Best Practices

Read the MetaMask Contributor Docs [Tailwind CSS Guidelines](https://github.com/MetaMask/contributor-docs/blob/main/docs/tailwind-css.md) to ensure you're using Tailwind CSS effectively and consistently across the mobile codebase. You can also look for examples of design system component and tailwind classname usage in [design-system.stories.tsx](../app/component-library/components/design-system.stories.tsx)

### Getting Help

- Reach out to the design system team on slack #metamask-design-system
