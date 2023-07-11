# BottomSheetFooter

BottomSheetFooter is a Footer component specifically used for BottomSheets.

## Props

This component extends React Native's [ViewProps](https://reactnative.dev/docs/view) component.

### `buttonsAlignment`

Optional prop to control the alignment of the buttons.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| ButtonsAlignment                                   | No                                                     | ButtonsAlignment.Horizontal          |


## Usage

```javascript
<BottomSheetFooter 
  buttonsAlignment={ButtonsAlignment.Horizontal} 
  buttonPropsArray={[SAMPLE_BUTTONPROPS, SAMPLE_BUTTONPROPS]}/>;
```
