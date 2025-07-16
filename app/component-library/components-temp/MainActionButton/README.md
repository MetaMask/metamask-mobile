# MainActionButton

MainActionButton is a vertical button component that displays an icon above a text label, built on top of React Native's Pressable component. It's designed for main action buttons like the ones shown in the bottom action bar. The component has fixed dimensions and styling for consistency across the app.

## Props

This component extends [PressableProps](https://reactnative.dev/docs/pressable) from React Native's [Pressable](https://reactnative.dev/docs/pressable) component.

### `iconName`

Icon name of the icon that will be displayed.

| <span style="color:gray;font-size:14px">TYPE</span>   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :---------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../../components/Icons/Icon/Icon.types.ts) | Yes                                                     |

### `label`

Label text that will be displayed below the icon.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `isDisabled`

Optional param to disable the button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

## Design Specifications

- **Dimensions**: Fixed 68px minimum width and height
- **Icon**: Md size (20px) with Alternative color
- **Text**: BodySMMedium variant with Default color
- **Background**: Background muted (default) and background pressed (on press)
- **Border Radius**: 12px
- **Animation**: Scale animation (0.98) with 150ms duration on press
- **Disabled State**: 50% opacity

## Usage

```javascript
// Replace import with relative path.
import MainActionButton from 'app/component-library/components-temp/MainActionButton';
import { IconName } from 'app/component-library/components/Icons/Icon';

<MainActionButton
  iconName={IconName.Add}
  label="Add"
  onPress={() => console.log('Button pressed')}
/>;
```

## Example

```javascript
import React from 'react';
import { View } from 'react-native';
import MainActionButton from 'app/component-library/components-temp/MainActionButton';
import { IconName } from 'app/component-library/components/Icons/Icon';

const ActionButtonExample = () => (
  <View style={{ flexDirection: 'row', gap: 16 }}>
    <MainActionButton
      iconName={IconName.BuySell}
      label="Buy/Sell"
      onPress={() => console.log('Buy/Sell pressed')}
    />
    <MainActionButton
      iconName={IconName.SwapHorizontal}
      label="Swap"
      onPress={() => console.log('Swap pressed')}
    />
    <MainActionButton
      iconName={IconName.Receive}
      label="Receive"
      onPress={() => console.log('Receive pressed')}
    />
    <MainActionButton
      iconName={IconName.Send}
      label="Send"
      onPress={() => console.log('Send pressed')}
    />
  </View>
);
```
