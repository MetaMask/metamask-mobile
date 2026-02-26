import { useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useCardSDK } from '../sdk';
import { cardQueries } from '../queries';
import { useTheme } from '../../../../util/theme';
import type { CardPinTokenResponse } from '../types';

/* eslint-disable @metamask/design-tokens/color-no-hex */
const PIN_CSS = {
  dark: { backgroundColor: '#000', textColor: '#FFF' },
  light: { backgroundColor: '#FFF', textColor: '#000' },
} as const;

interface UseCardPinTokenResult {
  generatePinToken: () => Promise<CardPinTokenResponse>;
  isLoading: boolean;
  error: Error | null;
  imageUrl: string | null;
  reset: () => void;
}

/**
 * Hook to generate a secure token for viewing the card PIN as an image.
 * Uses React Query useMutation since this is a one-off POST (not cached data).
 * The token is time-limited (~10 minutes) and single-use.
 * Automatically applies dark/light theme styling to the PIN image.
 */
const useCardPinToken = (): UseCardPinTokenResult => {
  const { sdk } = useCardSDK();
  const theme = useTheme();

  const customCss = useMemo(
    () => (theme.themeAppearance === 'dark' ? PIN_CSS.dark : PIN_CSS.light),
    [theme.themeAppearance],
  );

  const { mutateAsync, isPending, error, data, reset } = useMutation({
    mutationKey: cardQueries.pin.keys.token(),
    mutationFn: cardQueries.pin.tokenMutationFn(sdk),
  });

  const generatePinToken = useCallback(
    () => mutateAsync({ customCss }),
    [mutateAsync, customCss],
  );

  return {
    generatePinToken,
    isLoading: isPending,
    error,
    imageUrl: data?.imageUrl ?? null,
    reset,
  };
};

export default useCardPinToken;
