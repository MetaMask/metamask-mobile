import { useMemo } from 'react';
import { MOCK_SOCIAL_V1_HOT_TOKENS } from '../mocks/socialV1HotTokens.mock';
import type { UseSocialV1HotTokensResult } from '../types';

/**
 * Temporary hot-tokens data source until the ranking logic lands. Matches the
 * shape a live ranking would return so the carousel can swap implementations
 * without changing the chip UI.
 */
export const useSocialV1HotTokens = (): UseSocialV1HotTokensResult =>
  useMemo(
    () => ({
      tokens: MOCK_SOCIAL_V1_HOT_TOKENS,
      isLoading: false,
      error: null,
    }),
    [],
  );
