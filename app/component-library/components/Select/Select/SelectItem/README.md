# SelectItem

SelectItem is a wrapper component typically used for item selection scenarios.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacityProps](https://reactnative.dev/docs/touchableopacity) component and [ListItemProps](../../../List/ListItem/ListItem.types.ts).

### `isSelected`

Optional prop to determine if the item is selected.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean    | No                                                     | false                                               |

### `isDisabled`

Optional prop to determine if the item is disabled.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean    | No                                                     | false                                               |

## Usage

```javascript
<SelectItem 
  onPress={ONPRESS_HANDLER} 
  isSelected 
  isDisabled={false}>
  <SampleContent />
</SelectItem>;
```
