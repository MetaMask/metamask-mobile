import React, { useMemo, useState, useCallback } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { CaipChainId, toCaipChainId } from '@metamask/utils';

import { useStyles } from '../../../hooks';
import styleSheet from './MultichainAddressRowsList.styles';
import Text, { TextVariant, TextColor } from '../../../components/Texts/Text';
import TextFieldSearch from '../../../components/Form/TextFieldSearch';
import { TextFieldSize } from '../../../components/Form/TextField/TextField.types';
import { strings } from '../../../../../locales/i18n';
import MultichainAddressRow, { SAMPLE_ICONS } from '../MultichainAddressRow';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../selectors/multichainNetworkController';
import {
  NetworkAddressItem,
  sortNetworkAddressItems,
  getCompatibleNetworksForAccount,
} from './MultichainAddressRowsList.utils';
import {
  MULTICHAIN_ADDRESS_ROWS_LIST_TEST_ID,
  MULTICHAIN_ADDRESS_ROWS_LIST_EMPTY_MESSAGE_TEST_ID,
  MULTICHAIN_ADDRESS_ROWS_LIST_SEARCH_TEST_ID,
} from './MultichainAddressRowsList.constants';

export interface MultichainAddressRowsListProps {
  accounts?: InternalAccount[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const MultichainAddressRowsList: React.FC<MultichainAddressRowsListProps> = ({
  accounts = [],
  style,
  testID = MULTICHAIN_ADDRESS_ROWS_LIST_TEST_ID,
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const [searchPattern, setSearchPattern] = useState<string>('');

  const evmNetworks = useSelector(selectEvmNetworkConfigurationsByChainId);
  const nonEvmNetworks = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );

  // Process all networks and generate network address items
  const networkAddressItems = useMemo(() => {
    const allNetworks: Record<
      CaipChainId,
      { name: string; chainId: CaipChainId }
    > = {};

    // Add EVM networks with hex chain IDs
    Object.entries(evmNetworks || {}).forEach(([hexChainId, networkConfig]) => {
      if (networkConfig?.name) {
        const caipChainId = toCaipChainId('eip155', hexChainId);
        allNetworks[caipChainId] = {
          name: networkConfig.name,
          chainId: caipChainId,
        };
      }
    });

    // Add non-EVM networks with CAIP chain IDs
    Object.entries(nonEvmNetworks || {}).forEach(([chainId, networkConfig]) => {
      const caipChainId = chainId as CaipChainId;
      if (networkConfig?.name) {
        allNetworks[caipChainId] = {
          name: networkConfig.name,
          chainId: caipChainId,
        };
      }
    });

    // Generate network address items for all accounts
    const items: NetworkAddressItem[] = [];
    accounts.forEach((account) => {
      const compatibleNetworks = getCompatibleNetworksForAccount(
        account,
        allNetworks,
      );
      items.push(...compatibleNetworks);
    });

    return sortNetworkAddressItems(items);
  }, [accounts, evmNetworks, nonEvmNetworks]);

  // Filter items based on search pattern
  const filteredItems = useMemo(() => {
    if (!searchPattern.trim()) {
      return networkAddressItems;
    }

    const pattern = searchPattern.toLowerCase();
    return networkAddressItems.filter(
      (item) =>
        item.networkName.toLowerCase().includes(pattern) ||
        item.address.toLowerCase().includes(pattern),
    );
  }, [networkAddressItems, searchPattern]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchPattern(text);
  }, []);

  const renderNetworkAddressItem = useCallback(
    ({ item }: { item: NetworkAddressItem }) => (
      <MultichainAddressRow
        chainId={item.chainId}
        networkName={item.networkName}
        address={item.address}
        icons={SAMPLE_ICONS}
      />
    ),
    [],
  );

  const renderEmptyMessage = () => {
    const messageKey = searchPattern.trim()
      ? 'multichain_accounts.address_rows_list.no_networks_found'
      : 'multichain_accounts.address_rows_list.no_networks_available';

    return (
      <View style={styles.emptyContainer}>
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          testID={MULTICHAIN_ADDRESS_ROWS_LIST_EMPTY_MESSAGE_TEST_ID}
        >
          {strings(messageKey)}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.searchContainer}>
        <TextFieldSearch
          placeholder={strings(
            'multichain_accounts.address_rows_list.search_placeholder',
          )}
          value={searchPattern}
          onChangeText={handleSearchChange}
          size={TextFieldSize.Lg}
          // @ts-expect-error - React Native style type mismatch due to outdated @types/react-native (v0.70.13) with RN v0.76.9
          // See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382
          style={styles.searchTextField}
          testID={MULTICHAIN_ADDRESS_ROWS_LIST_SEARCH_TEST_ID}
        />
      </View>

      <FlatList
        style={styles.list}
        data={filteredItems}
        renderItem={renderNetworkAddressItem}
        keyExtractor={(item, index) =>
          `${item.chainId}-${item.address}-${index}`
        }
        ListEmptyComponent={renderEmptyMessage}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

export default MultichainAddressRowsList;
