import React, { useCallback, useEffect } from 'react';
import { View, Text, ActivityIndicator, FlatList, ListRenderItem, RefreshControl } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import { styleSheet } from './styles';
import { usePopularTokens } from '../../hooks/TokenSearchDiscovery/usePopularTokens/usePopularTokens';
import { MoralisTokenResponseItem } from '@metamask/token-search-discovery-controller';
import { TokenResult } from './TokenResult';
import { SwapBridgeNavigationLocation, useSwapBridgeNavigation } from '../../UI/Bridge/hooks/useSwapBridgeNavigation';
import { Hex } from '@metamask/utils';
import { BridgeToken } from '../../UI/Bridge/types';

export const TokenDiscovery: React.FC = () => {
    const { styles } = useStyles(styleSheet, {});
    const { results, isLoading, fetchPopularTokens } = usePopularTokens();

    useEffect(() => {
        fetchPopularTokens();
    }, [fetchPopularTokens]);

    const { goToSwaps: goToSwapsHook, networkModal } = useSwapBridgeNavigation({
        location: SwapBridgeNavigationLocation.TokenDetails,
        sourcePage: 'MainView',
      });
    
      const goToSwaps = useCallback(async (result: MoralisTokenResponseItem) => {
        try {
          const token = {
            address: result.token_address,
            symbol: result.token_symbol,
            chainId: result.chain_id as Hex,
            decimals: 18,
            isFromSearch: true,
          } as BridgeToken;
          await goToSwapsHook(token);
        } catch (error) {
          return;
        }
      }, [goToSwapsHook]);

    const renderItem = useCallback<ListRenderItem<MoralisTokenResponseItem>>(({ item }) => {
        return (
            <TokenResult
                result={item}
                onPress={() => {}}
                onSwapPress={goToSwaps}
            />
        );
    }, [goToSwaps]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerText}>Popular Tokens</Text>
            </View>
            <FlatList<MoralisTokenResponseItem>
                data={results}
                renderItem={renderItem}
                keyExtractor={(item) => `${item.chain_id}-${item.token_address}`}
                refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchPopularTokens} />}
            />
            {networkModal}
        </View>
    );
};
