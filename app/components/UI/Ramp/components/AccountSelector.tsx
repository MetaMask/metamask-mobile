import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import SelectorButton from '../../../Base/SelectorButton';
import Avatar, {
  AvatarAccountType,
  AvatarSize,
  AvatarVariant,
} from '../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

import { useAccountName } from '../../../hooks/useAccountName';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { formatAddress } from '../../../../util/address';
import { createAccountSelectorNavDetails } from '../../../Views/AccountSelector';
import { type RootState } from '../../../../reducers';

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

const AccountSelector = () => {
  const navigation = useNavigation();
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const accountName = useAccountName();

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
      navigation.navigate(
        ...createAccountSelectorNavDetails({
          disablePrivacyMode: true,
        }),
      ),
    [navigation],
  );

  const shortenedAddress = formatAddress(
    selectedFormattedAddress || '',
    'short',
  );

  const displayedAddress = accountName
    ? `(${shortenedAddress})`
    : shortenedAddress;

  return (
    <SelectorButton onPress={openAccountSelector} style={styles.selector}>
      {selectedAddress && selectedFormattedAddress ? (
        <>
          <Avatar
            variant={AvatarVariant.Account}
            type={accountAvatarType}
            accountAddress={selectedAddress}
            size={AvatarSize.Xs}
          />
          <Text
            variant={TextVariant.BodyMDMedium}
            style={styles.accountText}
            numberOfLines={1}
            ellipsizeMode="middle"
          >
            {accountName} {displayedAddress}
          </Text>
        </>
      ) : (
        <Text variant={TextVariant.BodyMD}>Account is loading...</Text>
      )}
    </SelectorButton>
  );
};

export default AccountSelector;
