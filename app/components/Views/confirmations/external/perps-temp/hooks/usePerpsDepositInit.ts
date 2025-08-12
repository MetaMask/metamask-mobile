import Engine from '../../../../../../core/Engine';
import { useSelector } from 'react-redux';
import { selectTokensByChainIdAndAddress } from '../../../../../../selectors/tokensController';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { HYPERLIQUID_ASSET_CONFIGS } from '../../../../../UI/Perps/constants/hyperLiquidConfig';
import { Hex, parseCaipAssetId } from '@metamask/utils';
import { useAsyncResult } from '../../../../../hooks/useAsyncResult';

const USDC_SYMBOL = 'USDC';
const USDC_DECIMALS = 6;

export function usePerpsDepositInit() {
  const { NetworkController, TokensController } = Engine.context;

  const tokens = useSelector((state) =>
    selectTokensByChainIdAndAddress(state, CHAIN_IDS.ARBITRUM),
  );

  const tokenAddress = parseCaipAssetId(
    HYPERLIQUID_ASSET_CONFIGS.USDC.mainnet,
  ).assetReference.toLowerCase() as Hex;

  const hasToken = Object.values(tokens).some(
    (token) => token.address.toLowerCase() === tokenAddress,
  );

  useAsyncResult(async () => {
    if (hasToken) {
      return;
    }

    const networkClientId = NetworkController.findNetworkClientIdByChainId(
      CHAIN_IDS.ARBITRUM,
    );

    await TokensController.addToken({
      address: tokenAddress,
      symbol: USDC_SYMBOL,
      decimals: USDC_DECIMALS,
      networkClientId,
    });
  }, [hasToken, tokenAddress]);
}
