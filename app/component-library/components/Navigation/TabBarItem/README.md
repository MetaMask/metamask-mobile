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
| [IconName](../Icons/Icon.types.ts)                  | Yes                                                     |

### `onPress`

Function to call when pressed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | Yes                                                     |

### `iconSize`

Size of the icon.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| [AvatarSize](../../Avatars/Avatar/Avatar.types.ts#L11) | Yes                                                     |

### `iconColor`

Color of the icon.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `iconBackgroundColor`

Background color of the icon.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

## Usage

You will most likely never have to use this component directly since it is already used to contruct the [TabBar](../TabBar/TabBar.tsx) component, which will be the component that is consumed by developers.

```javascript
import TabBarItem from 'app/component-library/components/Navigation/TabBarItem';

<HorizontallyAlignedWrapper>
  <TabBarItem
    label={LABEL_1}
    icon={ICON_1}
    onPress={ONPRESS_HANDLER_1}
    iconSize={ICON_SIZE}
    iconColor={ICON_COLOR}
    iconBackgroundColor={ICON_BACKGROUND_COLOR}
  />
  <TabBarItem
    label={LABEL_2}
    icon={ICON_2}
    onPress={ONPRESS_HANDLER_2}
    iconSize={ICON_SIZE}
    iconColor={ICON_COLOR}
    iconBackgroundColor={ICON_BACKGROUND_COLOR}
  />
  <TabBarItem
    label={LABEL_3}
    icon={ICON_3}
    onPress={ONPRESS_HANDLER_3}
    iconSize={ICON_SIZE}
    iconColor={ICON_COLOR}
    iconBackgroundColor={ICON_BACKGROUND_COLOR}
  />
</HorizontallyAlignedWrapper>;
```
