# Cell

This component is a union component, which consists of [CellDisplay](../CellDisplay/CellDisplay.tsx), [CellSelect](../CellSelect/CellSelect.tsx), and [CellMultiselect](../CellMultiselect/CellMultiselect.tsx)

## Common props

### `type`

Type of Cell.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [CellType](../CellBase/CellBase.types.ts#L7)                                              | Yes                                                     |

### `avatarProps`

Props of the [Avatar](../../Avatars/Avatar.tsx) Component to retrieve avatar.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [AvatarProps](../../Avatars/Avatar.types.ts#L19)                                              | Yes                                                     |

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

### `label`

Optional label (using Tag component) below the title/secondaryText/tertiaryText.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

### `children`

Optional accessory that can be inserted on the right of Cell.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

## CellMultiselect and CellSelect only props

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

## Usage

```javascript
// Change import path to relative path.
import Cell, { CellType } from 'app/component-library/components/Cells/Cell/Cell';

<Cell
  type={CellType.Multiselect}
  avatarProps={AVATAR_PROPS}
  title={TITLE}
  secondaryText={SECONDARY_TEXT}
  tertiaryText={TERTIARY_TEXT}
  tagLabel={TAG_LABEL}
  isSelected={false}
  onPress={() => Alert.alert('Pressed account Cell!')}
/>;
```
