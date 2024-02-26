# BaseSelectableButton

BaseSelectableButton is a base component, used for any trigger or selectable buttons, such as SelectButton or DropdownButton.

## Props

This component extends `PressableProps` from React Native's [Pressable](https://reactnative.dev/docs/pressable) component.

### `children`

Optional prop for the main content of the BaseSelectableButton

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                     |

### `caretIconEl`

Optional enum to replace the caret Icon

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                     |

### `isDisabled`

Optional prop to configure the disabled state.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                   |

### `isDanger`

Optional prop to configure the danger state.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                   |

### `placeholder`

Optional enum for the placeholder string when there is no value selected

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| string                                                | No                                                     | 'Select an item'                                                     |

## Usage

```javascript
<BaseSelectableButton
  isDanger={false}
  isDisabled={false}
  caretIconEl={<SAMPLE_CARETICONEL_COMPONENT/>}
  placeholder={'SAMPLE_PLACEHOLDER_STRING'}
/>;
```
