import { QuoteResponse } from '@metamask/bridge-controller';
import { SolMethod } from '@metamask/keyring-api';
import { base58 } from 'ethers/lib/utils';
import AppConstants from '../../../core/AppConstants';
import { useCallback } from 'react';
import { useBridgeSession } from '../../../components/UI/Bridge/hooks/useBridgeSession';

export default function useValidateBridgeTx() {
  const {
    quoteParams: { walletAddress },
  } = useBridgeSession();

  const validateBridgeTx = useCallback(
    async ({
      quoteResponse,
      signal,
    }: {
      quoteResponse: QuoteResponse;
      signal?: AbortSignal;
    }) => {
      const response = await fetch(
        `${AppConstants.SECURITY_ALERTS_API.URL}/solana/message/scan`,
        {
          signal,
          headers: {
            'Content-Type': 'application/json',
            accept: 'application/json',
          },
          method: 'POST',
          body: JSON.stringify({
            method: SolMethod.SignAndSendTransaction,
            encoding: 'base64',
            account_address: walletAddress
              ? Buffer.from(base58.decode(walletAddress)).toString('base64')
              : undefined,
            chain: 'mainnet',
            transactions: [quoteResponse.trade],
            options: ['simulation', 'validation'],
            metadata: {
              url: null,
            },
          }),
        },
      );
      return response.json();
    },
    [walletAddress],
  );

  return { validateBridgeTx };
}
