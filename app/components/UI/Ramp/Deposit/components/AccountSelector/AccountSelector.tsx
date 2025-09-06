import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useAccountName } from '../../../../../hooks/useAccountName';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { type RootState } from '../../../../../../reducers';
import { useStyles } from '../../../../../../component-library/hooks/useStyles';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { BuildQuoteSelectors } from '../../../../../../../e2e/selectors/Ramps/BuildQuote.selectors';
import stylesheet from './AccountSelector.styles';

interface AccountSelectorProps {
  isEvmOnly?: boolean;
}

const AccountSelector: React.FC<AccountSelectorProps> = ({
  isEvmOnly = true,
}) => {
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const accountName = useAccountName();
  const { styles, theme } = useStyles(stylesheet, {});

  const accountAvatarType = useSelector((state: RootState) =>
    state.settings.useBlockieIcon
      ? AvatarAccountType.Blockies
      : AvatarAccountType.JazzIcon,
  );

  const selectedFormattedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const openAccountSelector = useCallback(
    () =>
      navigation.navigate('RootModalFlow', {
        screen: 'AddressSelector',
        params: {
          isEvmOnly,
        },
      }),
    [navigation, isEvmOnly],
  );

  return (
    <TouchableOpacity
      onPress={openAccountSelector}
      style={styles.selector}
      testID={BuildQuoteSelectors.ACCOUNT_PICKER}
    >
      {selectedAddress && selectedFormattedAddress ? (
        <>
          <Avatar
            variant={AvatarVariant.Account}
            type={accountAvatarType}
            accountAddress={selectedAddress}
            size={AvatarSize.Sm}
          />
          <Text
            variant={TextVariant.BodyMD}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {accountName}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={theme.colors.icon.alternative}
          />
        </>
      ) : (
        <Text variant={TextVariant.BodyMD}>Account is loading...</Text>
      )}
    </TouchableOpacity>
  );
};

export default AccountSelector;
