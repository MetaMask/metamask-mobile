# CellAccountDisplayItem

CellAccountDisplayItem is a component used for displaying cell account.

## Props

This component extends [CellAccountDisplayContainerProps](../CellAccountDisplayItemContainer/CellAccountDisplayItemContainer/CellAccountDisplayItemContainer.types.ts) and [CellAccountBaseItem](../CellAccountBaseItem/CellAccountBaseItem.types.ts#L17).

### `type`

Type of CellAccount.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [CellAccountBaseItemType.Display](../CellAccountBaseItem/CellAccountBaseItem.types.ts#L7)                                              | Yes                                                     |

### `avatarAccountAddress`

An Ethereum wallet address to retrieve avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `avatarAccountType`

[AvatarAccount](../../Avatars/AvatarAccount/AvatarAccount.tsx) variants.

| <span style="color:gray;font-size:14px">TYPE</span>         | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :---------------------------------------------------------- | :------------------------------------------------------ |
| [AvatarAccount](../../Avatars/AvatarAccount/AvatarAccount.types.ts#L6) | Yes                                                     |

### `title`

Title of the Cell Account, 1 line truncation.

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

### `label`

Optional label (using Tag component) below the title/secondaryText/tertiaryText.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

### `children`

Optional accessory that can be inserted on the right of Cell Account.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

## Usage

```javascript
// Change import path to relative path.
import { AvatarAccountType } from 'app/component-library/components/Avatars/AvatarAccount/AvatarAccount';
import { CellAccountDisplayItem } from 'app/component-library/components/Cells/CellAccountDisplayItem/CellAccountDisplayItem';
import { CellAccountBaseItemType } from 'app/component-library/components/Cells/CellAccountBaseItem/CellAccountBaseItem.types';

<CellAccountDisplayItem
  type={CellAccountBaseItemType.Display}
  avatarAccountAddress={ACCOUNT_ADDRESS}
  avatarAccountType={AvatarAccountType.JazzIcon}
  title={TITLE}
  secondaryText={SECONDARY_TEXT}
  tertiaryText={TERTIARY_TEXT}
  tagLabel={TAG_LABEL}
/>;
```
