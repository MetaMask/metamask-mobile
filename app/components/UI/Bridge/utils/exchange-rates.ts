import { isSolanaChainId } from '@metamask/bridge-controller';
import { Hex, CaipAssetType } from '@metamask/utils';
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { addCurrencySymbol, balanceToFiatNumber } from '../../../../util/number';
import { BridgeToken } from '../types';


interface GetDisplayFiatValueParams {
  token: BridgeToken | undefined;
  amount: string | undefined;
  multiChainMarketData: Record<Hex, Record<Hex, { price: number | undefined; }>> |
  undefined;
  networkConfigurationsByChainId: Record<Hex, { nativeCurrency: string; }>;
  multiChainCurrencyRates: Record<string, { conversionRate: number | null; }> |
  undefined;
  currentCurrency: string;
  nonEvmMultichainAssetRates: ReturnType<typeof selectMultichainAssetsRates>;
}

export const getDisplayFiatValue = ({
  token, amount, multiChainMarketData, // EVM
  networkConfigurationsByChainId, multiChainCurrencyRates, // EVM
  currentCurrency, nonEvmMultichainAssetRates, // Non-EVM
}: GetDisplayFiatValueParams): string => {
  if (!token || !amount) {
    return addCurrencySymbol('0', currentCurrency);
  }

  let balanceFiatCalculation = 0;

  if (isSolanaChainId(token.chainId)) {
    const assetId = token.address as CaipAssetType;
    // This rate is asset to fiat. Whatever the user selected display fiat currency is.
    // We don't need to have an additional conversion from native token to fiat.
    const rate = nonEvmMultichainAssetRates?.[assetId]?.rate || '0';
    balanceFiatCalculation = Number(
      balanceToFiatNumber(amount, Number(rate), 1)
    );
  } else {
    // EVM
    const evmChainId = token.chainId as Hex;
    const multiChainExchangeRates = multiChainMarketData?.[evmChainId];
    const tokenMarketData = multiChainExchangeRates?.[token.address as Hex];

    const nativeCurrency = networkConfigurationsByChainId[evmChainId]?.nativeCurrency;
    const multiChainConversionRate = multiChainCurrencyRates?.[nativeCurrency]?.conversionRate ?? 0;

    balanceFiatCalculation = Number(
      balanceToFiatNumber(
        amount,
        multiChainConversionRate,
        tokenMarketData?.price ?? 0
      )
    );
  }

  if (balanceFiatCalculation >= 0.01 || balanceFiatCalculation === 0) {
    return addCurrencySymbol(balanceFiatCalculation, currentCurrency);
  }

  return `< ${addCurrencySymbol('0.01', currentCurrency)}`;
};
