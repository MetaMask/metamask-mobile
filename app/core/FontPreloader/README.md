# FontPreloader

A service to preload custom fonts and prevent placeholder text shifting issues in React Native applications.

## Problem

The MetaMask Mobile app uses custom Geist fonts. When TextInput components render before these fonts are fully loaded and cached, placeholder text can appear shifted or misaligned. This happens because:

1. **Font Loading Race Conditions**: TextInput renders with system font, then shifts when custom font loads
2. **Platform Differences**: iOS and Android handle custom font loading differently
3. **Baseline Misalignment**: Custom fonts have different baseline metrics than system fonts
4. **Zero Padding Issues**: `paddingVertical: 0` combined with custom fonts causes positioning problems

## Solution

FontPreloader ensures all custom fonts are loaded and cached before any UI components render, eliminating text shifting issues.

## Usage

### Basic Usage

```tsx
import FontPreloader from '../core/FontPreloader/FontPreloader';

// Check if fonts are loaded
if (FontPreloader.areFontsLoaded()) {
  // Safe to render components with text
}

// Preload fonts
await FontPreloader.preloadFonts();
```

### With React Hook

```tsx
import { useFontPreloader } from '../hooks/useFontPreloader';

const MyComponent = () => {
  const fontsLoaded = useFontPreloader();

  if (!fontsLoaded) {
    return <LoadingSpinner />;
  }

  return <MyUIWithText />;
};
```

### In Root Component

```tsx
const Root = () => {
  const fontsLoaded = useFontPreloader();

  // Show loading until fonts are ready
  if (!fontsLoaded) {
    return <FoxLoader />;
  }

  return <App />;
};
```

## How It Works

1. **Early Loading**: Fonts are preloaded in `index.js` before app initialization
2. **Platform Detection**: Uses different strategies for web vs React Native
3. **Font Cache Warming**: Creates invisible text elements to trigger font loading
4. **Singleton Pattern**: Ensures single instance across app lifecycle
5. **Error Handling**: Gracefully handles loading failures without blocking app

## Implementation Details

### Web Platform

- Creates invisible DOM elements with all font variants
- Uses FontFace API when available for precise loading detection
- Falls back to timeout-based loading for older browsers

### React Native Platform

- Fonts are pre-registered in `Info.plist` (iOS) and `assets` (Android)
- Uses short delay to ensure font cache is warmed up
- Platform-specific timing optimization

### Font Variants Loaded

- Geist Regular (400)
- Geist Medium (500)
- Geist Bold (700)
- All text variants used in the design system

## API Reference

### FontPreloader

#### Methods

- `preloadFonts(): Promise<void>` - Preload all fonts
- `areFontsLoaded(): boolean` - Check if fonts are loaded
- `reset(): void` - Reset loading state (for testing)
- `getLoadingPromise(): Promise<void> | null` - Get current loading promise

### useFontPreloader Hook

Returns `boolean` indicating if fonts are loaded.

### useFontPreloaderWithStatus Hook

Returns object with detailed loading state:

```tsx
{
  loaded: boolean;
  loading: boolean;
  error: boolean;
}
```

## Integration Points

1. **index.js**: Early preloading
2. **Root component**: Loading state management
3. **Input styles**: Font-aware padding and alignment
4. **Text components**: Baseline correction

## Testing

Run tests with:

```bash
yarn jest app/core/FontPreloader/__tests__/FontPreloader.test.ts
```

## Performance Impact

- **Initial Load**: ~50-100ms additional startup time
- **Memory**: Minimal - fonts are cached by system
- **Runtime**: Zero impact after initial load
- **Bundle Size**: ~2KB additional code

## Browser Support

- **Modern Browsers**: Full support with FontFace API
- **Legacy Browsers**: Fallback timeout-based loading
- **React Native**: Full support on iOS and Android

## Troubleshooting

### Fonts Still Shifting

1. Check if fonts are registered in `Info.plist` (iOS) and `link-assets-manifest.json`
2. Verify font files exist in `app/fonts/`
3. Check console for FontPreloader error messages

### Loading Taking Too Long

1. Check network connectivity (web only)
2. Verify font file sizes aren't too large
3. Check for JavaScript errors preventing initialization

### Tests Failing

1. Ensure mocks are properly configured
2. Reset FontPreloader state between tests
3. Check for async test timing issues

## Related Files

- `app/component-library/components/Form/TextField/foundation/Input/Input.styles.ts` - Font-aware input styling
- `app/component-library/components/Texts/Text/Text.utils.ts` - Font family utilities
- `app/hooks/useFontPreloader.ts` - React hooks for font loading
- `app/components/Views/Root/index.tsx` - Root component integration
