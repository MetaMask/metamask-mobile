import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { CardType } from '../types';
import type { CardSecureView } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';
import Engine from '../../../../core/Engine';

// Hex colors required by the external card details API
/* eslint-disable @metamask/design-tokens/color-no-hex */
export const CARD_DETAILS_CSS = {
  [CardType.VIRTUAL]: {
    cardBackgroundColor: '#FF5C16',
    cardTextColor: '#FFFFFF',
    panBackgroundColor: '#EFEFEF',
    panTextColor: '#000000',
  },
  [CardType.PHYSICAL]: {
    cardBackgroundColor: '#3D065F',
    cardTextColor: '#FFFFFF',
    panBackgroundColor: '#EFEFEF',
    panTextColor: '#000000',
  },
  [CardType.METAL]: {
    cardBackgroundColor: '#3D065F',
    cardTextColor: '#FFFFFF',
    panBackgroundColor: '#EFEFEF',
    panTextColor: '#000000',
  },
};

interface UseCardDetailsTokenResult {
  fetchCardDetailsToken: (
    cardType?: CardType,
  ) => Promise<CardSecureView | null>;
  isLoading: boolean;
  isImageLoading: boolean;
  onImageLoad: () => void;
  error: Error | null;
  imageUrl: string | null;
  clearImageUrl: () => void;
}

const useCardDetailsToken = (): UseCardDetailsTokenResult => {
  const isAuthenticated = useSelector(selectIsCardAuthenticated);

  const [isLoading, setIsLoading] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fetchCardDetailsToken = useCallback(
    async (
      cardType: CardType = CardType.VIRTUAL,
    ): Promise<CardSecureView | null> => {
      if (!isAuthenticated) {
        return null;
      }

      setIsLoading(true);
      setIsImageLoading(true);
      setError(null);

      try {
        const customCss = CARD_DETAILS_CSS[cardType];
        const response = await Engine.context.CardController.getCardDetailsView(
          {
            customCss,
          },
        );
        setImageUrl(response.url);
        return response;
      } catch (err) {
        setIsImageLoading(false);
        const fetchError =
          err instanceof Error ? err : new Error('Unknown error occurred');
        setError(fetchError);
        throw fetchError;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated],
  );

  const onImageLoad = useCallback(() => {
    setIsImageLoading(false);
  }, []);

  const clearImageUrl = useCallback(() => {
    setImageUrl(null);
    setError(null);
    setIsImageLoading(false);
  }, []);

  return {
    fetchCardDetailsToken,
    isLoading,
    isImageLoading,
    onImageLoad,
    error,
    imageUrl,
    clearImageUrl,
  };
};

export default useCardDetailsToken;
