import { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { SolMethod } from '@metamask/keyring-api';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { base58 } from 'ethers/lib/utils';
import AppConstants from '../../../core/AppConstants';

export default function useValidateBridgeTx() {
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const validateBridgeTx = async ({
    quoteResponse,
    signal,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
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
          account_address: selectedAccount?.address
            ? Buffer.from(base58.decode(selectedAccount.address)).toString(
                'base64',
              )
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
  };

  return { validateBridgeTx };
}
