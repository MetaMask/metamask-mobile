# [RadioButton](https://metamask-consensys.notion.site/Radio-Button-b1747843d5364be59185fed947f4a3a9)

![RadioButton](./RadioButton.png)

`RadioButton` is a graphical element that allows users to select one option from a set of choices

## Props

This component extends [TouchableOpacityProps](https://reactnative.dev/docs/touchableopacity#props) from React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity) component

### `label`

Optional label for the `RadioButton`

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string | ReactNode                                    | No                                                     |

### `isChecked`

Optional prop to configure the checked state

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                     | false                                                 |

### `isDisabled`

Optional prop to configure the disabled state

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                     | false                                                 |

### `isReadonly`

Optional prop to configure the readonly state

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                     | false                                                 |

### `isDanger`

Optional prop to configure the danger state

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                     | false                                                 |

## Usage

```javascript
<RadioButton 
    label={SAMPLE_RadioButton_LABEL}
    isChecked
    isDisabled
    isReadOnly
    isDanger/>;
```
