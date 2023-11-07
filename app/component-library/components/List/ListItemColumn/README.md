# ListItemColumn

ListItemColumn is a wrapper component to be placed in a ListItem.

## Props

This component extends [ViewProps](https://reactnative.dev/docs/view-style-props) from React Native's [View](https://reactnative.dev/docs/view) component.

### `children`

Optional prop for content to wrap to display.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                     |

### `widthType`

Optional prop to configure the width of the column.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| WidthType                                            | No                                                     |                   WidthType.Auto                                         |

## Usage

```javascript
<ListItemColumn widthType={WidthType.Fill}>
  {SAMPLE_CHILDREN_COMPONENT}
</ListItemColumn>
```
