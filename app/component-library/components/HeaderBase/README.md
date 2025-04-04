# [HeaderBase](https://metamask-consensys.notion.site/Header-Base-2e96e1ac4c2b4816bb7bd3c594c72538)

![HeaderBase](./HeaderBase.png)

The HeaderBase component is a reusable UI component for displaying a header with optional startAccessory, children (title) and endAccessory content areas. It is designed to be flexible and customizable for various use cases to keep a visually balanced appearance.

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

// HeaderBase with String title
<HeaderBase 
  startAccessory={SAMPLE_STARTACCESSORY} 
  endAccessory={SAMPLE_ENDACCESSORY}>
  {SAMPLE_TITLE_STRING}
</HeaderBase>;

// HeaderBase with custom title
<HeaderBase 
  startAccessory={SAMPLE_STARTACCESSORY} 
  endAccessory={SAMPLE_ENDACCESSORY}>
  {CUSTOM_TITLE_NODE}
</HeaderBase>;
```
