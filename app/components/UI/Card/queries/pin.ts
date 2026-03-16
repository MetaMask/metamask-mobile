import { CardSDK } from '../sdk/CardSDK';
import type { CardPinTokenRequest, CardPinTokenResponse } from '../types';

export const pinKeys = {
  all: () => ['card', 'pin'] as const,
  token: () => [...pinKeys.all(), 'token'] as const,
};

export const pinTokenMutationFn =
  (sdk: CardSDK | null) =>
  async (request?: CardPinTokenRequest): Promise<CardPinTokenResponse> => {
    if (!sdk) throw new Error('CardSDK not available');
    return sdk.generateCardPinToken(request);
  };
