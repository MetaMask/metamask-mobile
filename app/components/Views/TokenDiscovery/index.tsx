import React, { useCallback, useEffect } from 'react';
import { View, Text, FlatList, ListRenderItem, RefreshControl } from 'react-native';
import { useStyles } from '../../../component-library/hooks';
import { styleSheet } from './styles';
import { usePopularTokens } from '../../hooks/TokenSearchDiscovery/usePopularTokens/usePopularTokens';
import { MoralisTokenResponseItem } from '@metamask/token-search-discovery-controller';
import { SearchDiscoveryResult } from '../../UI/SearchDiscoveryResult';
import { mapMoralisTokenToResult } from '../../../util/search-discovery/map-moralis-token-to-result';
import { useSelector } from 'react-redux';
import { selectUsdConversionRate } from '../../../selectors/currencyRateController';
import { TokenDiscoveryProps } from './types';

export const TokenDiscovery: React.FC<TokenDiscoveryProps> = ({ onSelect }) => {
    const { styles } = useStyles(styleSheet, {});
    const usdConversionRate = useSelector(selectUsdConversionRate);
    const { results, isLoading, fetchPopularTokens } = usePopularTokens();

    useEffect(() => {
        fetchPopularTokens();
    }, [fetchPopularTokens]);

    const renderItem = useCallback<ListRenderItem<MoralisTokenResponseItem>>(({ item }) => (
            <SearchDiscoveryResult
                result={mapMoralisTokenToResult(item, usdConversionRate)}
                onSelect={onSelect}
            />
        ), [onSelect, usdConversionRate]);

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
        </View>
    );
};
