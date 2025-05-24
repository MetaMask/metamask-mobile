import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import { DISCOVERY_TOKENS_LIMIT } from './constants';
import { MoralisTokenResponseItem } from '@metamask/token-search-discovery-controller';

export const useTrending = (active: boolean) => {
    const [results, setResults] = useState<MoralisTokenResponseItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error>();

    const { TokenSearchDiscoveryController } = Engine.context;
    const fetchTrendingTokens = useCallback(async () => {
        try {
            if (isLoading) {
                return;
            }
            setIsLoading(true);
            const response = await TokenSearchDiscoveryController.getTrendingTokens({
                limit: DISCOVERY_TOKENS_LIMIT,
                // @TODO: Add swappable once the PR is merged and released
            });
            setResults(response);
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsLoading(false);
        }
    }, [isLoading, TokenSearchDiscoveryController]);

    useEffect(() => {
        if (!active) {
            return;
        }
        fetchTrendingTokens();
    }, [active, fetchTrendingTokens]);

    return {
        results,
        isLoading,
        error,
        refetch: fetchTrendingTokens
    };
};
