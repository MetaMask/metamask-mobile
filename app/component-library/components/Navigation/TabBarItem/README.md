# TabBarItem

This is a component used to construct a tab bar.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity) component.

### `label`

Label of the tab item.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `icon`

Icon of the tab item.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](../Icon/Icon.types.ts#L53)               | Yes                                                     |

### `isSelected`

Boolean that states if the item is selected.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| boolean                                             | Yes                                                     |

### `onPress`

Function to call when pressed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | Yes                                                     |

## Usage

You will most likely never have to use this component directly since it is already used to contruct the [TabBar](../TabBar/TabBar.tsx) component, which will be the component that is consumed by developers.

```javascript
import TabBarItem from 'app/component-library/components/Navigation/TabBarItem';

<HorizontallyAlignedWrapper>
  <TabBarItem
    isSelected={isSelected}
    label={LABEL_1}
    icon={ICON_1}
    onPress={ONPRESS_HANDLER_1}
  />
  <TabBarItem
    isSelected={isSelected}
    label={LABEL_2}
    icon={ICON_2}
    onPress={ONPRESS_HANDLER_2}
  />
  <TabBarItem
    isSelected={isSelected}
    label={LABEL_3}
    icon={ICON_3}
    onPress={ONPRESS_HANDLER_3}
  />
</HorizontallyAlignedWrapper>;
```
