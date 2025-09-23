import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import SelectorButton from '../../../../Base/SelectorButton';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import { useAccountName } from '../../../../hooks/useAccountName';
import { formatAddress } from '../../../../../util/address';
import { BuildQuoteSelectors } from '../../../../../../e2e/selectors/Ramps/BuildQuote.selectors';
import { createAddressSelectorNavDetails } from '../../../../Views/AddressSelector/AddressSelector';
import { useRampSDK } from '../sdk';
import { getRampNetworks } from '../../../../../reducers/fiatOrders';
import { useSelector } from 'react-redux';
import { isCaipChainId, toCaipChainId } from '@metamask/utils';

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
  const { selectedAddress } = useRampSDK();
  const accountName = useAccountName();

  const rampNetworks = useSelector(getRampNetworks);
  const rampNetworksCaipIds = rampNetworks.map((network) => {
    if (isCaipChainId(network.chainId)) {
      return network.chainId;
    }
    return toCaipChainId('eip155', network.chainId);
  });

  const openAccountSelector = useCallback(
    () =>
      navigation.navigate(
        ...createAddressSelectorNavDetails({
          isEvmOnly,
          displayOnlyCaipChainIds: rampNetworksCaipIds,
        }),
      ),
    [isEvmOnly, navigation, rampNetworksCaipIds],
  );

  const shortenedAddress = formatAddress(selectedAddress || '', 'short');

  const displayedAddress = accountName
    ? `(${shortenedAddress})`
    : shortenedAddress;

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
