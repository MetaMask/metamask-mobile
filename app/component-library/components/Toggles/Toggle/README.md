# Toggle

Toggle is a component used to represent a switch between true or false.

## Props

This component extends React Native's [Switch](https://reactnative.dev/docs/switch) component.

### `isSelected`

Determines if toggle is selected.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

## React Native's Switch Props

### `disabled`

If true the user won't be able to toggle the switch.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

### `onChange`

Invoked with the the change event as an argument when the value changes.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | No                                                     |

### `onValueChange`

Invoked with the new value when the value changes.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | No                                                     |

## Usage

```javascript
// Replace import with relative path.
import Toggle from 'app/component-library/components/Toggles/Toggle/Toggle';

<Toggle 
  isSelected 
  disabled/>
```
