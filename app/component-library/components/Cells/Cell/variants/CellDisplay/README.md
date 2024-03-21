# CellDisplay

CellDisplay is a component used for displaying cell displays.

## Props

This component extends [CellBase](../../foundation/CellBase/CellBase.types.ts#L13).

### `avatarProps`

Props for the [Avatar](../../../../Avatars/Avatar.tsx) component (with the exception of size). Avatar size is restricted to size Md(32x32) for Cells

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| [AvatarProps](../../../../Avatars/Avatar.types.ts#L19) | Yes                                                     |

### `title`

Title of the Cell, 1 line truncation.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `secondaryText`

Optional secondary text below the title, 1 line truncation.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

### `tertiaryText`

Optional tertiary text below the secondaryText, 1 line truncation.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

### `tagLabel`

Optional label (using [Tag](../../../../Tags/Tag/Tag.tsx) component) below the title/secondaryText/tertiaryText.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

## Usage

```javascript
<CellDisplay
  avatarProps={SAMPLE_AVATAR_PROPS}
  title={SAMPLE_TITLE}
  secondaryText={SAMPLE_SECONDARY_TEXT}
  tertiaryText={SAMPLE_TERTIARY_TEXT}
  tagLabel={SAMPLE_TAG_LABEL}
/>;
```
