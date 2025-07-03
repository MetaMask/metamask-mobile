import { useCallback, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import { DISCOVERY_TOKENS_LIMIT } from '../constants';
import { MoralisTokenResponseItem } from '@metamask/token-search-discovery-controller';

export const usePopularTokens = () => {
    const [results, setResults] = useState<MoralisTokenResponseItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error>();
    const isLoadingRef = useRef(false);

    const { TokenSearchDiscoveryController } = Engine.context;
    const fetchPopularTokens = useCallback(async () => {
        try {
            if (isLoadingRef.current) {
                return;
            }
            isLoadingRef.current = true;
            setIsLoading(true);
            const response = await TokenSearchDiscoveryController.getBlueChipTokens({
                limit: DISCOVERY_TOKENS_LIMIT,
                swappable: true,
            });
            setResults(response);
        } catch (err) {
            setError(err as Error);
        } finally {
            isLoadingRef.current = false;
            setIsLoading(false);
        }
    }, [TokenSearchDiscoveryController]);

    return {
        fetchPopularTokens,
        results,
        isLoading,
        error,
    };
};
