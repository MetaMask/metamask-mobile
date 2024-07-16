# CellMultiSelect

CellMultiSelect is a component used for accessing account selection.

## Props

This component extends [ListItemMultiSelectProps](../../List/ListItemMultiSelect/ListItemMultiSelect.types.ts#L7) and [CellBase](../CellBase/CellBase.types.ts#L17).

### `avatarProps`

Props for the [Avatar](../../../../Avatars/Avatar.tsx) component (with the exception of size). Avatar size is restricted to size Md(32x32) for Cells

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| [AvatarProps](../../../../Avatars/Avatar.types.ts#L19) | Yes                                                     |

### `title`

Title of the Cell, 1 line truncation.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                 | Yes                                                     |

### `secondaryText`

Optional secondary text below the title, 1 line truncation.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                 | No                                                      |

### `tertiaryText`

Optional tertiary text below the secondaryText, 1 line truncation.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string or ReactNode                                 | No                                                      |

### `tagLabel`

Optional label (using [Tag](../../../../Tags/Tag/Tag.tsx) component) below the title/secondaryText/tertiaryText.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

### `children`

Optional accessory that can be inserted on the right of Cell.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

### `onPress`

Callback to trigger when pressed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | Yes                                                     |

### `isSelected`

Optional boolean to show Selected state in Cell.
Default: false

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

### `isDisabled`

Optional boolean to show disabled state in Cell.
Default: false

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

## Usage

```javascript
// Default
<CellMultiSelect avatarProps={avatarProps} title={'Sample Title'} />;

// Passing Component to title
<CellMultiSelect avatarProps={avatarProps} title={SampleTitleComponent} />;

// Passing string to secondaryText
<CellMultiSelect
  avatarProps={avatarProps}
  title={'Sample Title'}
  secondaryText={'Sample secondaryText'}
/>;

// Passing Component to secondaryText
<CellMultiSelect
  avatarProps={avatarProps}
  title={'Sample Title'}
  secondaryText={SampleSecondaryTextComponent}
/>;

// Passing string to tertiaryText
<CellMultiSelect
  avatarProps={avatarProps}
  title={'Sample Title'}
  tertiaryText={'Sample tertiaryText'}
/>;

// Passing Component to tertiaryText
<CellMultiSelect
  avatarProps={avatarProps}
  title={'Sample Title'}
  tertiaryText={SampleTertiaryTextComponent}
/>;

// Adding tagLabel
<CellMultiSelect
  avatarProps={avatarProps}
  title={'Sample Title'}
  tagLabel={'Tag Label'}
/>;

// Adding accessory to the right of the info section (children)
<CellMultiSelect avatarProps={avatarProps} title={'Sample Title'}>
  {SampleEndAccessoryComponent}
</CellMultiSelect>;

// Configuring isSelected (checked state)
<CellMultiSelect avatarProps={avatarProps} title={'Sample Title'} isSelected />;

// Configuring isDisabled (disabled state)
<CellMultiSelect avatarProps={avatarProps} title={'Sample Title'} isDisabled />;
```
