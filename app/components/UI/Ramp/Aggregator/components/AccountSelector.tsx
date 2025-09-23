import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { isCaipChainId, toCaipChainId } from '@metamask/utils';

import SelectorButton from '../../../../Base/SelectorButton';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import { useAccountName } from '../../../../hooks/useAccountName';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { formatAddress } from '../../../../../util/address';
import { BuildQuoteSelectors } from '../../../../../../e2e/selectors/Ramps/BuildQuote.selectors';
import { createAddressSelectorNavDetails } from '../../../../Views/AddressSelector/AddressSelector';
import { getRampNetworks } from '../../../../../reducers/fiatOrders';
import { getNetworkImageSource } from '../../../../../util/networks';
import { selectChainId } from '../../../../../selectors/networkController';

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
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const selectedChainId = useSelector(selectChainId);
  const accountName = useAccountName();

  const selectedFormattedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const rampNetworks = useSelector(getRampNetworks);

  const selectedCaipChainId = isCaipChainId(selectedChainId)
    ? selectedChainId
    : toCaipChainId('eip155', selectedChainId);

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

  const shortenedAddress = formatAddress(
    selectedFormattedAddress || '',
    'short',
  );

  const displayedAddress = accountName
    ? `(${shortenedAddress})`
    : shortenedAddress;

  return (
    <SelectorButton
      onPress={openAccountSelector}
      style={styles.selector}
      testID={BuildQuoteSelectors.ACCOUNT_PICKER}
    >
      {selectedAddress && selectedFormattedAddress ? (
        <>
          <Avatar
            variant={AvatarVariant.Network}
            size={AvatarSize.Xs}
            imageSource={getNetworkImageSource({
              chainId: selectedCaipChainId,
            })}
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
