import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import SelectorButton from '../../../../Base/SelectorButton';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import { useAccountName } from '../../../../hooks/useAccountName';
import { BuildQuoteSelectors } from '../../../../../../e2e/selectors/Ramps/BuildQuote.selectors';
import { createAddressSelectorNavDetails } from '../../../../Views/AddressSelector/AddressSelector';

import { getRampNetworks } from '../../../../../reducers/fiatOrders';
import { useSelector } from 'react-redux';
import { isCaipChainId, toCaipChainId } from '@metamask/utils';
import { createAccountSelectorNavDetails } from '../../../../Views/AccountSelector';

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
        ...createAccountSelectorNavDetails({
          isEvmOnly,
        }),
      ),
    [isEvmOnly, navigation, rampNetworksCaipIds],
  );

  return (
    <SelectorButton
      onPress={openAccountSelector}
      style={styles.selector}
      testID={BuildQuoteSelectors.ACCOUNT_PICKER}
    >
      {/* fox icon here?  */}
      <Text
        variant={TextVariant.BodyMDMedium}
        style={styles.accountText}
        numberOfLines={1}
        ellipsizeMode="middle"
      >
        {accountName}
      </Text>
    </SelectorButton>
  );
};

export default AccountSelector;
