import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';

import SelectorButton from '../../../../Base/SelectorButton';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Avatar, {
  AvatarVariant,
  AvatarSize,
} from '../../../../../component-library/components/Avatars/Avatar';

import { useAccountGroupName } from '../../../../hooks/multichainAccounts/useAccountGroupName';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { BuildQuoteSelectors } from '../Views/BuildQuote/BuildQuote.testIds';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';
import { selectAvatarAccountType } from '../../../../../selectors/settings';

const styles = StyleSheet.create({
  selector: {
    flexShrink: 1,
  },
  accountText: {
    flexShrink: 1,
    marginVertical: 3,
    marginHorizontal: 5,
  },
});

const AccountSelector = ({ isEvmOnly }: { isEvmOnly?: boolean }) => {
  const navigation = useNavigation();
  const accountName = useAccountGroupName();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const accountAvatarType = useSelector(selectAvatarAccountType);

  const openAccountSelector = useCallback(() => {
    navigation.navigate(
      ...createAccountSelectorNavDetails({
        isEvmOnly,
        disableAddAccountButton: true,
      }),
    );
  }, [isEvmOnly, navigation]);

  return (
    <SelectorButton
      onPress={openAccountSelector}
      style={styles.selector}
      testID={BuildQuoteSelectors.ACCOUNT_PICKER}
    >
      {selectedAddress ? (
        <>
          <Avatar
            variant={AvatarVariant.Account}
            size={AvatarSize.Xs}
            accountAddress={selectedAddress}
            type={accountAvatarType}
          />
          <Text
            variant={TextVariant.BodyMDMedium}
            style={styles.accountText}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {accountName}
          </Text>
        </>
      ) : (
        <Text variant={TextVariant.BodyMD}>Account is loading...</Text>
      )}
    </SelectorButton>
  );
};

export default AccountSelector;
