import { useCallback, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTheme } from '../../../../util/theme';
import Engine from '../../../../core/Engine';
import type { CardSecureView } from '../../../../core/Engine/controllers/card-controller/provider-types';

/* eslint-disable @metamask/design-tokens/color-no-hex */
export const PIN_CSS = {
  dark: { backgroundColor: '#121314', textColor: '#FFF' },
  light: { backgroundColor: '#FFF', textColor: '#000' },
} as const;

interface UseCardPinTokenResult {
  generatePinToken: () => Promise<CardSecureView>;
  isLoading: boolean;
  error: Error | null;
  imageUrl: string | null;
  reset: () => void;
}

const useCardPinToken = (): UseCardPinTokenResult => {
  const theme = useTheme();

  const customCss = useMemo(
    () => (theme.themeAppearance === 'dark' ? PIN_CSS.dark : PIN_CSS.light),
    [theme.themeAppearance],
  );

  const { mutateAsync, isPending, error, data, reset } = useMutation<
    CardSecureView,
    Error,
    void
  >({
    mutationFn: () =>
      Engine.context.CardController.getCardPinView({ customCss }),
  });

  const generatePinToken = useCallback(() => mutateAsync(), [mutateAsync]);

  return {
    generatePinToken,
    isLoading: isPending,
    error,
    imageUrl: data?.url ?? null,
    reset,
  };
};

export default useCardPinToken;
