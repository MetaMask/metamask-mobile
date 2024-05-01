# TagBase

TagBase is a base component for all Tags.

## TagBase Props

This component extends [ListItem](../../components/List/ListItem/)'s [ListItemProps](../../components/List/ListItem/ListItem.types.ts) component.

### `startAccessory`

Optional content to be displayed before the children.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                           | No                                                     |

### `children`

Content to wrap to display.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                   | Yes                                                     |

### `textProps`

Optional prop to configure the prop of children if a string is given.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                   | Yes                                                     |

### `endAccessory`

Optional content to be displayed after the children.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| React.ReactNode                                           | No                                                     |

### `shape`

Optional prop to configure the shape of the TagBase.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [TagShape](./TagBase.types.ts)    | No                                                     | TagShape.Pill                                |

### `severity`

Optional prop to configure the severity of the TagBaseProps.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [TagSeverity](./TagBase.types.ts)    | No                                                     | TagSeverity.Default                                |

### `includesBorder`

Optional prop to configure to show the border or not.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                              | No                                                     | false                                                  |

## ListItem Props

### `gap`

Optional prop to configure the gap between items inside the ListItem.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| number or string                                            | No                                                     |                   16                                         |

### `verticalAlignment`

Optional prop to configure the vertical alignment between items inside the ListItem.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| VerticalAlignment                                            | No                                                     |                   VerticalAlignment.Top                                         |

## Usage

```javascript
// Passing Component to startAccessory
<TagBase startAccessory={SampleComponent}>SAMPLE TAGBASE TEXT</TagBase>;

// Passing Component to endAccessory
<TagBase endAccessory={SampleComponent}>SAMPLE TAGBASE TEXT</TagBase>;

// Passing text to children
<TagBase>SAMPLE TAGBASE TEXT</TagBase>;

// Passing text with custom TextProps to children
<TagBase textProps={customTextProps}>SAMPLE TAGBASE TEXT</TagBase>;

// Passing node to children
<TagBase>
  <Text>SAMPLE TAGBASE TEXT</Text>
</TagBase>;

// Configuring different shapes
<TagBase shape={TagShape.Pill}>SAMPLE TAGBASE TEXT</TagBase>;
<TagBase shape={TagShape.Rectangle}>SAMPLE TAGBASE TEXT</TagBase>;

// Configuring different severities/colors
<TagBase severity={TagSeverity.Default}>SAMPLE TAGBASE TEXT</TagBase>;
<TagBase severity={TagSeverity.Neutral}>SAMPLE TAGBASE TEXT</TagBase>;
<TagBase severity={TagSeverity.Success}>SAMPLE TAGBASE TEXT</TagBase>;
<TagBase severity={TagSeverity.Info}>SAMPLE TAGBASE TEXT</TagBase>;
<TagBase severity={TagSeverity.Danger}>SAMPLE TAGBASE TEXT</TagBase>;
<TagBase severity={TagSeverity.Warning}>SAMPLE TAGBASE TEXT</TagBase>;

// Configuring border option
<TagBase includesBorder>SAMPLE TAGBASE TEXT</TagBase>;
```
