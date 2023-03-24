# TextFieldSearch

TextFieldSearch is an input component that allows users to enter text to search.
## Props

This component extends [TextField](./foundation/Input/Input.tsx) component.

### `showClearButton`

Optional boolean to show the Clear button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                              | No                                                     | false                                               |

### `onPressClearButton`

Function to trigger when pressing the clear button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |

### `clearButtonProps`

Optional prop to pass any additional props to the clear button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [ButtonIconProps](../../Buttons/ButtonIcon/ButtonIcon.types.ts)                                           | No                                                     |

## Usage

```javascript
<TextFieldSearch 
  showClearButton
  onPressClearButton={()=> {}}
  />
```
