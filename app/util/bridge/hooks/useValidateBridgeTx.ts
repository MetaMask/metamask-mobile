import { QuoteResponse } from '../../../components/UI/Bridge/types';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { useSelector } from 'react-redux';
import { SolMethod } from '@metamask/keyring-api';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { base58 } from 'ethers/lib/utils';

export default function useValidateBridgeTx() {
  const selectedAccount = useSelector(selectSelectedInternalAccount);

  const validateBridgeTx = async ({
    quoteResponse,
  }: {
    quoteResponse: QuoteResponse & QuoteMetadata;
  }) => {
    const response = await fetch(`https://security-alerts.api.cx.metamask.io/solana/message/scan`, {
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        method: SolMethod.SignAndSendTransaction,
        encoding: 'base64',
        account_address: selectedAccount?.address ? Buffer.from(base58.decode(selectedAccount.address)).toString('base64') : undefined,
        chain: "mainnet",
        transactions: [quoteResponse.trade],
        options: ['simulation', 'validation'],
        metadata: {
          url: null,
        },
      }),
    });
    return response.json();
  };

  return { validateBridgeTx };
}
