# CellAccount

This component is a union component, which consists of [CellAccountDisplayItem](../CellAccountDisplayItem/CellAccountDisplayItem.tsx), [CellAccountSelectItem](../CellAccountSelectItem/CellAccountSelectItem.tsx), and [CellAccountMultiselectItem](../CellAccountMultiselectItem/CellAccountMultiselectItem.tsx)

## Common props

### `type`

Type of CellAccount.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [CellAccountBaseItemType](../CellAccountBaseItem/CellAccountBaseItem.types.ts#L7)                                              | Yes                                                     |

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

## CellAccountMultiselectItem and CellAccountSelectItem only props

### `onPress`

Callback to trigger when pressed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| function                                            | Yes                                                     |

### `isSelected`

Optional boolean to show Selected state in Cell Account.
Default: false

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

## Usage

```javascript
// Change import path to relative path.
import { AvatarAccountType } from 'app/component-library/components/Avatars/AvatarAccount/AvatarAccount';
import { CellAccount } from 'app/component-library/components/Cells/CellAccount/CellAccount';
import { CellAccountBaseItemType } from 'app/component-library/components/CellAccountBaseItem/CellAccountBaseItem.types';

<CellAccount
  type={CellAccountBaseItemType.Multiselect}
  avatarAccountAddress={ACCOUNT_ADDRESS}
  avatarAccountType={AvatarAccountType.JazzIcon}
  title={TITLE}
  secondaryText={SECONDARY_TEXT}
  tertiaryText={TERTIARY_TEXT}
  tagLabel={TAG_LABEL}
  isSelected={false}
  onPress={() => Alert.alert('Pressed account Cell!')}
/>;
```
