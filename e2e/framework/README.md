# Refactored E2E TypeScript Framework

This directory contains the new TypeScript-based E2E testing framework updates.

## Key Improvements
- ✅ **Single-level retry mechanism** (eliminates nested retry anti-patterns)
- ✅ **Smart element checking** (visibility + enabled, stability optional)  
- ✅ **Better error messages** with retry context and timing
- ✅ **Type safety** with full TypeScript support
- ✅ **Performance optimized** (`checkStability: false` by default)
- ✅ **Actionable parameters** (`checkStability: true` vs `skipStabilityCheck: false`)

## Framework Architecture

### Core Classes
- **`Assertions.ts`** - Element state verification with auto-retry
- **`Gestures.ts`** - User interactions with stability checking
- **`Matchers.ts`** - Element selection and identification  
- **`Utilities.ts`** - Core utilities and retry mechanisms
- **`types.ts`** - TypeScript type definitions

### Key Features
- **Fast performance** - 100ms timeout per retry attempt
- **Clear error messages** - Shows actual vs expected retry counts and detailed error messages

## Usage Examples

### Basic Usage

```typescript
import { Assertions, Gestures, Matchers } from '../framework';

// Element selection
const button = await Matchers.getElementByID('submit-button');

// Assertions with descriptive messages
await Assertions.expectVisible(button, { 
  description: 'submit button should be visible' 
});

// Gestures with optional stability checking
await Gestures.tap(button, { 
  description: 'tap submit button'
});

// Enable stability checking for animated elements
await Gestures.tap(carouselItem, {
  checkStability: true,  // Wait for animations to complete
  description: 'tap carousel item'
});
```

### Performance Best Practices

```typescript
// ✅ DO: Let framework handle retries
await Gestures.tap(button);
await Assertions.expectVisible(nextScreen);

// ✅ DO: Use checkStability only when needed
await Gestures.tap(staticButton);  // Fast - no stability check

// ✅ DO: Enable stability for animations
await Gestures.tap(animatedButton, { checkStability: true });
```