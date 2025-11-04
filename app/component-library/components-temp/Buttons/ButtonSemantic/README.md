# ButtonSemantic

ButtonSemantic is a semantic button component that extends the ButtonBase from the MetaMask Design System. It provides predefined color schemes for Success and Danger states, with automatic background and text color handling based on the severity prop. The component uses Tailwind CSS for styling and supports all standard button features like loading states, disabled states, and size variations.

## Props

This component extends [ButtonBaseProps](https://metamask.github.io/design-system/components/button) from @metamask/design-system-react-native.

### `severity`

Severity variant that determines the button's color scheme.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ButtonSemanticSeverity                              | Yes                                                     |

#### ButtonSemanticSeverity Values

- `Success` - Green color scheme for positive actions
- `Danger` - Red color scheme for destructive actions

### `size`

Size variant of the button. Defaults to Large.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| ButtonSize                                          | No                                                      | ButtonSize.Lg                                          |

## Design Specifications

### Success Severity

- **Background (Default)**: success-muted
- **Background (Pressed)**: success-muted-pressed
- **Text Color**: success-default

### Danger Severity

- **Background (Default)**: error-muted
- **Background (Pressed)**: error-muted-pressed
- **Text Color**: error-default

### Sizes

- **Small (Sm)**: 32px height
- **Medium (Md)**: 40px height
- **Large (Lg)**: 48px height (default)

## Usage

```javascript
// Replace import with relative path.
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from 'app/component-library/components-temp/Buttons/ButtonSemantic';

<ButtonSemantic
  severity={ButtonSemanticSeverity.Success}
  onPress={() => console.log('Success action')}
>
  Confirm
</ButtonSemantic>;
```

## Examples

### Basic Usage

```javascript
import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from 'app/component-library/components-temp/Buttons/ButtonSemantic';

const ButtonSemanticExample = () => (
  <Box gap={4}>
    <ButtonSemantic
      severity={ButtonSemanticSeverity.Success}
      onPress={() => console.log('Confirm pressed')}
    >
      Confirm Transaction
    </ButtonSemantic>

    <ButtonSemantic
      severity={ButtonSemanticSeverity.Danger}
      onPress={() => console.log('Delete pressed')}
    >
      Delete Account
    </ButtonSemantic>
  </Box>
);
```

### With Different Sizes

```javascript
import React from 'react';
import { Box, ButtonSize } from '@metamask/design-system-react-native';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from 'app/component-library/components-temp/Buttons/ButtonSemantic';

const SizeExample = () => (
  <Box gap={4}>
    <ButtonSemantic
      severity={ButtonSemanticSeverity.Success}
      size={ButtonSize.Sm}
      onPress={() => console.log('Small pressed')}
    >
      Small
    </ButtonSemantic>

    <ButtonSemantic
      severity={ButtonSemanticSeverity.Success}
      size={ButtonSize.Md}
      onPress={() => console.log('Medium pressed')}
    >
      Medium
    </ButtonSemantic>

    <ButtonSemantic
      severity={ButtonSemanticSeverity.Success}
      size={ButtonSize.Lg}
      onPress={() => console.log('Large pressed')}
    >
      Large
    </ButtonSemantic>
  </Box>
);
```

### With Loading and Disabled States

```javascript
import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import ButtonSemantic, {
  ButtonSemanticSeverity,
} from 'app/component-library/components-temp/Buttons/ButtonSemantic';

const StateExample = () => (
  <Box gap={4}>
    <ButtonSemantic
      severity={ButtonSemanticSeverity.Success}
      isLoading={true}
      onPress={() => console.log('Loading pressed')}
    >
      Processing...
    </ButtonSemantic>

    <ButtonSemantic
      severity={ButtonSemanticSeverity.Danger}
      isDisabled={true}
      onPress={() => console.log('Disabled pressed')}
    >
      Disabled Button
    </ButtonSemantic>
  </Box>
);
```
