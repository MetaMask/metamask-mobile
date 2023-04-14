# Header

Header is a general Header component, most commonly used for BottomSheets, Modals, Page Headers, and Popovers

## Props

This component extends React Native's [ViewProps](https://reactnative.dev/docs/view) component.

### `children`

Content to wrap to display.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string | ReactNode                                    | Yes                                                     |

### `startAccessory`

Optional prop to include content to be displayed before the title.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                     |

### `endAccessory`

Optional prop to include content to be displayed after the title.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                     |


## Usage

```javascript

// Header with String title
<Header 
  startAccessory={SAMPLE_STARTACCESSORY} 
  endAccessory={SAMPLE_ENDACCESSORY}>
  {SAMPLE_TITLE_STRING}
</Header>;

// Header with custom title
<Header 
  startAccessory={SAMPLE_STARTACCESSORY} 
  endAccessory={SAMPLE_ENDACCESSORY}>
  {CUSTOM_TITLE_NODE}
</Header>;
```
