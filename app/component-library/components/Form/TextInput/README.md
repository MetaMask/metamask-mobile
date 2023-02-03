# TextInput

TextInput is a light-weight borderless input component used inside of TextField

## Props

This component extends React Native's [TextInput](https://reactnative.dev/docs/textinput) component.

### `textVariant`

Optional enum to select between Typography variants.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [TextVariants](../../Texts/Text/Text.types.ts)    | No                                                     | TextVariants.sBodyMd                                               |

### `disabled`

Optional boolean to disable TextInput.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                              | No                                                     |  false                                                  |

### `disableStateStyles`

Optional boolean to disable state styles.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                              | No                                                     |  false                                                  |

## Usage

```javascript
<TextInput 
  textVariant={TextVariants.sBodyMD} 
  disabled 
  disableStateStyles/>
```
