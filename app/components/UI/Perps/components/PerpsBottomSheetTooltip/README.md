# PerpsBottomSheetTooltip - Scalable Content Architecture

## Overview

The `PerpsBottomSheetTooltip` component supports both simple string-based content and complex custom components through a scalable content registry system.

## Architecture

### Content Types

The system supports two types of content:

1. **String Content**: Simple text content fetched from localization strings
2. **Custom Components**: Complex components with custom formatting and logic

### File Structure

```
PerpsBottomSheetTooltip/
├── index.ts                               # Main exports
├── PerpsBottomSheetTooltip.tsx           # Main component
├── PerpsBottomSheetTooltip.types.ts      # Component types
├── PerpsBottomSheetTooltip.styles.ts     # Component styles
├── PerpsBottomSheetTooltip.test.tsx      # Tests
└── content/                              # Content renderer system
    ├── index.ts                          # Content exports
    ├── types.ts                          # Content system types
    ├── contentRegistry.ts                # Registry mapping contentKeys to renderers
    ├── FeesTooltipContent.tsx            # Custom fees content component
    └── FeesTooltipContent.styles.ts      # Fees component styles
```

## How It Works

### 1. Content Registry

The `contentRegistry.ts` file maps `contentKey` values to their custom renderers:

```typescript
export const tooltipContentRegistry: ContentRegistry = {
  fees: FeesTooltipContent, // Custom component
  leverage: undefined, // Uses default string content
  liquidation_price: undefined, // Uses default string content
  margin: undefined, // Uses default string content
};
```

### 2. Content Rendering Logic

The main component uses this registry to determine how to render content:

```typescript
const renderContent = () => {
  const CustomRenderer = tooltipContentRegistry[contentKey];

  if (CustomRenderer) {
    // Use custom component renderer
    return <CustomRenderer testID={`${testID}-content`} />;
  }

  // Fall back to default string-based content
  return (
    <Text
      variant={TextVariant.BodyMD}
      color={TextColor.Alternative}
      testID={`${testID}-content`}
    >
      {strings(`perps.tooltips.${contentKey}.content`)}
    </Text>
  );
};
```

## Adding New Custom Tooltips

To add a new tooltip with custom content:

### 1. Create the Custom Component

Create a new file in the `content/` directory:

```typescript
// content/MyCustomTooltipContent.tsx
import React from 'react';
import { View } from 'react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import { TooltipContentProps } from './types';
import createStyles from './MyCustomTooltipContent.styles';

const MyCustomTooltipContent = ({ testID }: TooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});

  return <View testID={testID}>{/* Your custom content here */}</View>;
};

export default MyCustomTooltipContent;
```

### 2. Add to Content Registry

Update `contentRegistry.ts`:

```typescript
import MyCustomTooltipContent from './MyCustomTooltipContent';

export const tooltipContentRegistry: ContentRegistry = {
  fees: FeesTooltipContent,
  my_custom_tooltip: MyCustomTooltipContent, // Add your custom component
  // ... other entries
};
```

### 3. Add to Types

Update the `PerpsTooltipContentKey` type in `PerpsBottomSheetTooltip.types.ts`:

```typescript
export type PerpsTooltipContentKey =
  | 'leverage'
  | 'liquidation_price'
  | 'margin'
  | 'fees'
  | 'my_custom_tooltip'; // Add your new content key
```

### 4. Add Localization Strings

Add the localization strings to `en.json`:

```json
{
  "perps": {
    "tooltips": {
      "my_custom_tooltip": {
        "title": "My Custom Tooltip",
        "content": "Default content if needed"
      }
    }
  }
}
```

## Benefits

### 1. Scalability

- Easy to add new custom tooltips without modifying the main component
- No hardcoded conditionals for specific content types
- Clean separation of concerns

### 2. Maintainability

- Each custom tooltip lives in its own file
- Registry system provides clear overview of all custom content
- Consistent interface for all custom components

### 3. Flexibility

- Custom components can have any level of complexity
- Full access to styles and testID for consistent theming
- Can include interactive elements, animations, etc.

### 4. Independent Styling

- Each custom component manages its own styles
- No coupling between main component and custom component styles
- Follows established `.styles.ts` pattern from the codebase

### 5. Backward Compatibility

- Existing simple tooltips continue to work unchanged
- No breaking changes to the public API

## Example: Fees Tooltip

The fees tooltip demonstrates the custom content approach:

```typescript
// FeesTooltipContent.tsx
const FeesTooltipContent = ({ testID }: TooltipContentProps) => {
  const { styles } = useStyles(createStyles, {});
  const metamaskFee = '0.1%';
  const providerFee = '0.0432%';

  return (
    <View testID={testID}>
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.feeRow}
      >
        {strings('perps.tooltips.fees.metamask_fee', { fee: metamaskFee })}
      </Text>
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {strings('perps.tooltips.fees.provider_fee', { fee: providerFee })}
      </Text>
    </View>
  );
};
```

This provides:

- Proper localization for each fee line
- Custom styling with proper spacing
- Maintainable fee calculation logic
- Consistent theming with the design system
