# ListItem

ListItem is a wrapper component used to display an individual item within a list.

## Props

This component extends [ViewProps](https://reactnative.dev/docs/view-style-props) from React Native's [View](https://reactnative.dev/docs/view) component.

### `children`

Content to wrap to display.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode or ReactNode[]                                          | No                                                     |

### `gap`

Optional prop to configure the gap between items inside the ListItem.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| number or string                                         | No                                                     |

### `verticalAlignment`

Optional prop to configure the vertical alignment between items inside the ListItem.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| VerticalAlignment                                            | No                                                     |                   VerticalAlignment.Top                                         |

## Usage

```javascript
<ListItem 
  gap={20} 
  verticalAlignment={VerticalAlignment.Center}
>
  {SAMPLE_CHILDREN_COMPONENT}
</ListItem>
```
