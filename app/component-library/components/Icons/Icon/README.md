# Icon

Icon is a component which is used to render icons from our icon set.

## Props

This component extends [ViewProps](https://reactnative.dev/docs/view-style-props) from React Native's [View](https://reactnative.dev/docs/view) component.

### `size`

Optional enum to select between icon sizes.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [AvatarSize](../Avatar/Avatar.types.ts#L6)          | Yes                                                     | Md                                                     |

### `name`

Icon to use.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [IconName](./Icon.types.ts#L53)                     | Yes                                                     |

### `color`

Color to apply to the icon. Defaults to `icon.default` from theme.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | No                                                      |

```javascript
// Replace import with relative path.
import Icon, {
  IconSize,
  IconName,
} from 'app/component-library/components/Icons/Icon';

<Icon name={IconName.Bank} size={IconSize.Md} color={ICON_COLOR} />;
```
