# [TextFieldSearch](https://metamask-consensys.notion.site/Text-Field-Search-de685317eeaf413f9682363128ffe673)

![TextFieldSearch](./TextFieldSearch.png)

TextFieldSearch is an input component that allows users to enter text to search.

## Props

This component extends [TextField](./foundation/Input/Input.tsx) component.

### Clear Button Behavior

The clear button is automatically shown when the input has a value. No additional prop is needed to control its visibility.

### `onPressClearButton`

Function to trigger when pressing the clear button.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |

### `clearButtonProps`

Optional prop to pass any additional props to the clear button.

| <span style="color:gray;font-size:14px">TYPE</span>             | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------- | :------------------------------------------------------ |
| [ButtonIconProps](../../Buttons/ButtonIcon/ButtonIcon.types.ts) | No                                                      |

## Usage

```javascript
const [searchText, setSearchText] = useState('');

<TextFieldSearch
  value={searchText}
  onChangeText={setSearchText}
  onPressClearButton={() => setSearchText('')}
  placeholder="Search..."
/>;
```
