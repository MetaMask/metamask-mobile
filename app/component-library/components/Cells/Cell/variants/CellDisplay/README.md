# CellDisplay

CellDisplay is a component used for displaying cell displays.

## Props

This component extends [CellDisplay](../../foundation/CellDisplay/CellDisplay.types.ts#L13).

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

## Usage

```javascript
// Default
<CellDisplay avatarProps={avatarProps} title={'Sample Title'} />;

// Passing Component to title
<CellDisplay avatarProps={avatarProps} title={SampleTitleComponent} />;

// Passing string to secondaryText
<CellDisplay
  avatarProps={avatarProps}
  title={'Sample Title'}
  secondaryText={'Sample secondaryText'}
/>;

// Passing Component to secondaryText
<CellDisplay
  avatarProps={avatarProps}
  title={'Sample Title'}
  secondaryText={SampleSecondaryTextComponent}
/>;

// Passing string to tertiaryText
<CellDisplay
  avatarProps={avatarProps}
  title={'Sample Title'}
  tertiaryText={'Sample tertiaryText'}
/>;

// Passing Component to tertiaryText
<CellDisplay
  avatarProps={avatarProps}
  title={'Sample Title'}
  tertiaryText={SampleTertiaryTextComponent}
/>;

// Adding tagLabel
<CellDisplay
  avatarProps={avatarProps}
  title={'Sample Title'}
  tagLabel={'Tag Label'}
/>;

// Adding accessory to the right of the info section (children)
<CellDisplay avatarProps={avatarProps} title={'Sample Title'}>
  {SampleEndAccessoryComponent}
</CellDisplay>;
```
