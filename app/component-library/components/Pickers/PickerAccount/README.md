# PickerAccount

PickerAccount is a component used for accessing account selection.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacityProps Component](https://reactnative.dev/docs/touchableOpacity).

### `accountAddress`

An Ethereum wallet address.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `accountName`

Name of the account.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `children`

Content to wrap in PickerAccount.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

```javascript
// Replace import with relative path.
import PickerAccount from 'app/component-library/components/Pickers/PickerAccount';

<PickerAccount
  accountAddress={ACCOUNT_ADDRESS}
  accountName={ACCOUNT_NAME}
  accountAvatarType={AvatarAccountType.JazzIcon}
  onPress={ONPRESS_HANDLER}
/>;
```
