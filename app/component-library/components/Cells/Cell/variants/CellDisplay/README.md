# CellDisplay

CellDisplay is a component used for displaying cell displays.

## Props

This component extends [CellDisplayContainerProps](../CellDisplayContainer/CellDisplayContainer/CellDisplayContainer.types.ts) and [CellBase](../CellBase/CellBase.types.ts#L17).

### `variant`

Variant of Cell.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [CellVariants](../../Cell.types.ts#L9)              | No                                                      |

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
// Change import path to relative path.
import CellDisplay from 'app/component-library/components/Cells/variants/CellDisplay/CellDisplay';
import { CellVariants } from 'app/component-library/components/Cells/Cell.types';

<CellDisplay
  variant={CellVariants.Display}
  avatarProps={AVATAR_PROPS}
  title={TITLE}
  secondaryText={SECONDARY_TEXT}
  tertiaryText={TERTIARY_TEXT}
  tagLabel={TAG_LABEL}
/>;
```
