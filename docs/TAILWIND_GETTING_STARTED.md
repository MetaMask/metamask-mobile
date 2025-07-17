# Tailwind CSS / TWRNC Get Started Guide

A comprehensive guide to get up and running with Tailwind CSS and TWRNC (Tailwind React Native Classnames) in MetaMask Mobile.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [VS Code Setup](#vs-code-setup)
4. [Understanding the Architecture](#understanding-the-architecture)
5. [Using Tailwind Classes](#using-tailwind-classes)
6. [Using the useTailwind Hook](#using-the-usetailwind-hook)
7. [Design System Integration](#design-system-integration)
8. [Best Practices](#best-practices)
9. [ESLint Configuration](#eslint-configuration)
10. [Common Patterns](#common-patterns)
11. [Troubleshooting](#troubleshooting)

## Overview

MetaMask Mobile uses a custom implementation of Tailwind CSS specifically designed for React Native through the TWRNC (Tailwind React Native Classnames) system. This allows developers to use utility-first CSS classes directly in React Native components while maintaining consistency with the MetaMask design system.

## Prerequisites

Before getting started, ensure you have:
- Node.js 20.18.0+ installed
- Yarn 1.22.22+ installed
- VS Code (recommended editor)
- Basic understanding of React Native and TypeScript

## VS Code Setup

### 1. Install Recommended Extensions

Install the **Tailwind CSS IntelliSense** extension for VS Code:

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Tailwind CSS IntelliSense"
4. Install the extension by Tailwind Labs

### 2. Configure VS Code Settings

Add the following to your VS Code settings (`.vscode/settings.json`):

```json
{
  "tailwindCSS.experimental.classRegex": [
    ["twClassName\\s*[:=]\\s*[\"'`]([^\"'`]*)", "([^\"'`]*)"],
    ["tw\\s*`([^`]*)`", "([^`]*)"],
    ["tw\\s*\\(\\s*[\"'`]([^\"'`]*)", "([^\"'`]*)"]
  ],
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

This configuration enables IntelliSense for:
- `twClassName` prop
- `tw` template literals
- `tw()` function calls

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
  <Box twClassName="p-4 bg-default">
    <Text twClassName="text-lg font-medium">Hello World</Text>
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
    <View style={tw`p-4 bg-default`}>
      <Text style={tw`text-lg font-medium text-default`}>Hello World</Text>
    </View>
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
    <ScrollView style={tw`flex-1 bg-default bg-primary-default`}>
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

// Simple conditional
const buttonStyle = tw`px-4 py-2 ${isActive ? 'bg-primary' : 'bg-secondary'}`;

// Using tw.style() for complex conditions
const complexStyle = tw.style(
  'base-classes',
  isActive && 'active-classes',
  isDisabled && 'disabled-classes',
  { 'conditional-classes': someCondition }
);
```

## Design System Integration

### Theme Provider

The app uses a `ThemeProvider` that automatically handles light/dark theme switching:

```tsx
import { ThemeProvider } from '@metamask/design-system-twrnc-preset';

// Theme is automatically managed by the provider
<ThemeProvider theme={designSystemTheme}>
  <YourApp />
</ThemeProvider>
```

### Available Design Tokens

The design system provides semantic tokens for:

- **Colors**: `bg-default`, `text-default`, `text-alternative`, `bg-pressed`, etc.
- **Spacing**: `p-1`, `p-2`, `p-4`, `m-2`, `gap-3`, etc.
- **Typography**: `text-sm`, `text-lg`, `font-medium`, etc.
- **Layout**: `flex-1`, `flex-row`, `items-center`, `justify-between`, etc.

## Best Practices

### 1. Follow MetaMask Tailwind Best Practices

Based on the contributor documentation, follow these best practices:

- **Use semantic color tokens** instead of raw colors
- **Prefer design system components** over custom implementations
- **Use consistent spacing** from the design system
- **Follow the established patterns** in the codebase

### 2. Component Organization

```tsx
// Good: Organize imports logically
import React from 'react';
import { ScrollView, Pressable } from 'react-native';
import {
  Box,
  Text,
  Button,
  Icon,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

// Good: Use descriptive component names
const WalletTokenList: React.FC = () => {
  const tw = useTailwind();
  
  return (
    <ScrollView style={tw`flex-1 bg-default`}>
      {/* Component content */}
    </ScrollView>
  );
};
```

### 3. Styling Patterns

```tsx
// Good: Use semantic tokens
<Box twClassName="p-4 bg-default border-b border-muted">
  <Text twClassName="text-lg font-medium text-default">Title</Text>
</Box>

// Good: Consistent spacing
<Box twClassName="p-4 gap-3">
  <Text>Item 1</Text>
  <Text>Item 2</Text>
</Box>

// Good: Responsive design patterns
<Box twClassName="flex-1 flex-row items-center justify-between">
  <Text twClassName="flex-1 text-default">Content</Text>
  <Button>Action</Button>
</Box>
```

## ESLint Configuration

The project includes ESLint rules for Tailwind CSS:

### Enabled Rules

```javascript
'tailwindcss/classnames-order': 'error',
'tailwindcss/enforces-negative-arbitrary-values': 'error',
'tailwindcss/enforces-shorthand': 'error',
'tailwindcss/no-custom-classname': 'error',
'tailwindcss/no-contradicting-classname': 'error',
'tailwindcss/no-unnecessary-arbitrary-value': 'error',
```

### Configuration

```javascript
settings: {
  tailwindcss: {
    callees: ['twClassName', 'tw'],
    config: './tailwind.config.js',
    tags: ['tw'], // Enable template literal support
  },
}
```

## Common Patterns

### 1. List Items

```tsx
<Pressable
  style={({ pressed }) =>
    tw.style(
      'w-full flex-row items-center justify-between px-4 py-2',
      pressed && 'bg-pressed',
    )
  }
>
  <Box twClassName="flex-1 overflow-hidden">
    <Text twClassName="font-medium" numberOfLines={1}>
      Title
    </Text>
    <Text twClassName="text-sm text-alternative">
      Subtitle
    </Text>
  </Box>
  <Box twClassName="items-end">
    <Text>$1,234.56</Text>
  </Box>
</Pressable>
```

### 2. Action Buttons

```tsx
<Box flexDirection={BoxFlexDirection.Row} gap={3} twClassName="p-4">
  <ButtonBase twClassName="h-20 flex-1 rounded-lg bg-muted px-0 py-4">
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
    >
      <Icon name={IconName.Send} />
      <Text fontWeight={FontWeight.Medium}>Send</Text>
    </Box>
  </ButtonBase>
</Box>
```

### 3. Cards and Containers

```tsx
<Box twClassName="w-full bg-default py-4">
  <Box twClassName="border-b border-muted p-4">
    <Text twClassName="text-lg font-medium">Card Title</Text>
  </Box>
  <Box twClassName="p-4">
    <Text twClassName="text-alternative">Card content</Text>
  </Box>
</Box>
```

## Troubleshooting

### Common Issues

1. **IntelliSense not working**
   - Ensure Tailwind CSS IntelliSense extension is installed
   - Check VS Code settings configuration
   - Restart VS Code

2. **ESLint errors**
   - Run `yarn lint:fix` to auto-fix issues
   - Check for custom class names (use design system tokens instead)

3. **Styles not applying**
   - Verify you're using the correct hook (`useTailwind`)
   - Check that the component is wrapped in `ThemeProvider`
   - Ensure class names match the design system tokens

### Getting Help

- Check the design system documentation
- Look for examples in `design-system.stories.tsx`
- Consult the MetaMask design system team
- Review existing component implementations

## Next Steps

1. **Explore the Design System**: Look at `app/component-library/components/design-system.stories.tsx` for comprehensive examples
2. **Review Existing Components**: Study how other components in the codebase use Tailwind classes
3. **Follow the Coding Guidelines**: Refer to `.github/guidelines/CODING_GUIDELINES.md` for general best practices
4. **Join the Community**: Engage with the MetaMask design system team for questions and feedback

---

For more information about the MetaMask design system, visit the [MetaMask Design System repository](https://github.com/MetaMask/metamask-design-system).