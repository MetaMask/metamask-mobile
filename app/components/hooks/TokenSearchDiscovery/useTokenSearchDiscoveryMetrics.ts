import { useCallback } from 'react';
import { MetaMetricsEvents, useMetrics } from '../useMetrics';
import { SearchDiscoveryCategory, SearchDiscoveryResultItem, TokenSearchDiscoveryResult } from '../../UI/SearchDiscoveryResult/types';
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';

const addProperties = (eventBuilder: MetricsEventBuilder, result: SearchDiscoveryResultItem, searchTerm: string | null) => {
    eventBuilder.addProperties({
        source: searchTerm === null ? 'discovery' : 'search',
        type: result.category,
    });
    if (result.category === SearchDiscoveryCategory.Tokens) {
        const { address, symbol, name, chainId } = result;
        eventBuilder.addProperties({
            token_address: address,
            token_symbol: symbol,
            token_name: name,
            token_chain_id: chainId,
        });
    } else {
        const { url, name } = result;
        eventBuilder.addProperties({
            site_url: url,
            site_name: name,
        });
    }

    if (searchTerm !== null) {
        eventBuilder.addProperties({
            search_term: searchTerm,
        });
    }
};

export const useTokenSearchDiscoveryMetrics = () => {
    const { trackEvent, createEventBuilder } = useMetrics();

    const trackItemOpened = useCallback((result: SearchDiscoveryResultItem, searchTerm: string | null) => {
        const eventBuilder = createEventBuilder(MetaMetricsEvents.TOKEN_SEARCH_DISCOVERY_ITEM_OPENED);
        addProperties(eventBuilder, result, searchTerm);
        trackEvent(eventBuilder.build());
    }, [createEventBuilder, trackEvent]);

    const trackSwapOpened = useCallback((result: TokenSearchDiscoveryResult, searchTerm: string | null) => {
        const eventBuilder = createEventBuilder(MetaMetricsEvents.TOKEN_SEARCH_DISCOVERY_SWAP_OPENED);
        addProperties(eventBuilder, result, searchTerm);
        trackEvent(eventBuilder.build());
    }, [createEventBuilder, trackEvent]);

    return {
        trackItemOpened,
        trackSwapOpened,
    };
};
