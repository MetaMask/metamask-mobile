import Engine from '../../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectTokensByChainIdAndAddress } from '../../../../../../selectors/tokensController';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useAsyncResult } from '../../../../../hooks/useAsyncResult';
import { ARBITRUM_USDC_ADDRESS } from '../../../constants/perps';

const USDC_SYMBOL = 'USDC';
const USDC_DECIMALS = 6;

export function usePerpsDepositInit() {
  const { NetworkController, TokensController } = Engine.context;

  const tokens = useSelector((state) =>
    selectTokensByChainIdAndAddress(state, CHAIN_IDS.ARBITRUM),
  );

  const hasToken = Object.values(tokens).some(
    (token) =>
      token.address.toLowerCase() === ARBITRUM_USDC_ADDRESS.toLowerCase(),
  );

  const { error } = useAsyncResult(async () => {
    if (hasToken) {
      return;
    }

    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      CHAIN_IDS.ARBITRUM,
    );

    await TokensController.addToken({
      address: ARBITRUM_USDC_ADDRESS,
      symbol: USDC_SYMBOL,
      decimals: USDC_DECIMALS,
      networkClientId,
    });
  }, [hasToken]);

  if (error) {
    console.error('Error adding USDC token:', error);
  }
}
