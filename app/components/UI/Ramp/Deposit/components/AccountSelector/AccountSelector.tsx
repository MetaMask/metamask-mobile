import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useAccountGroupName } from '../../../../../hooks/multichainAccounts/useAccountGroupName';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { useStyles } from '../../../../../../component-library/hooks/useStyles';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { BuildQuoteSelectors } from '../../../Aggregator/Views/BuildQuote/BuildQuote.testIds';
import stylesheet from './AccountSelector.styles';
import { selectAvatarAccountType } from '../../../../../../selectors/settings';
import { createAccountSelectorNavDetails } from '../../../../../Views/AccountSelector';

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
  const accountName = useAccountGroupName();
  const { styles, theme } = useStyles(stylesheet, {});

  const accountAvatarType = useSelector(selectAvatarAccountType);

  const openAccountSelector = useCallback(
    () =>
      navigation.navigate(
        ...createAccountSelectorNavDetails({
          disablePrivacyMode: true,
          disableAddAccountButton: true,
          isEvmOnly,
        }),
      ),
    [navigation, isEvmOnly],
  );

  return (
    <TouchableOpacity
      onPress={openAccountSelector}
      style={styles.selector}
      testID={BuildQuoteSelectors.ACCOUNT_PICKER}
    >
      {selectedAddress ? (
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
