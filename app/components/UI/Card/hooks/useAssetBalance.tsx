import { useSelector } from 'react-redux';
import { FlashListAssetKey } from '../../Tokens/TokenList';
import { RootState } from '../../../../reducers';
import { useMemo } from 'react';
import {
  makeSelectAssetByAddressAndChainId,
  makeSelectNonEvmAssetById,
} from '../../../../selectors/multichain';
import { selectIsEvmNetworkSelected } from '../../../../selectors/multichainNetworkController';
import { deriveBalanceFromAssetMarketDetails } from '../../Tokens/util';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountAddress,
} from '../../../../selectors/accountsController';
import { CaipAssetId, Hex } from '@metamask/utils';
import {
  selectCurrencyRateForChainId,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectShowFiatInTestnets } from '../../../../selectors/settings';
import { selectSingleTokenPriceMarketData } from '../../../../selectors/tokenRatesController';
import { selectSingleTokenBalance } from '../../../../selectors/tokenBalancesController';
import { formatWithThreshold } from '../../../../util/assets';
import {
  TOKEN_BALANCE_LOADING,
  TOKEN_RATE_UNDEFINED,
} from '../../Tokens/constants';
import I18n, { strings } from '../../../../../locales/i18n';
import { isTestNet } from '../../../../util/networks';
import { TokenI } from '../../Tokens/types';

// This hook retrieves the asset balance and related information for a given token and account.
const useAssetBalance = (
  token: FlashListAssetKey | null | undefined,
): {
  asset: TokenI | undefined;
  balanceFiat: string | undefined;
  mainBalance: string;
  secondaryBalance: string;
} => {
  const isEvmNetworkSelected = useSelector(selectIsEvmNetworkSelected);
  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const selectEvmAsset = useMemo(
    () => makeSelectAssetByAddressAndChainId(),
    [],
  );

  const evmAsset = useSelector((state: RootState) =>
    token?.chainId
      ? selectEvmAsset(state, {
          address: token.address,
          isStaked: token.isStaked,
          chainId: token.chainId,
        })
      : undefined,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const selectedAccount = useSelector(selectSelectedInternalAccount);
  const selectNonEvmAsset = useMemo(() => makeSelectNonEvmAssetById(), []);

  const nonEvmAsset = useSelector((state: RootState) =>
    token && selectedAccount?.id
      ? selectNonEvmAsset(state, {
          accountId: selectedAccount.id,
          assetId: token.address as CaipAssetId,
        })
      : undefined,
  );
  ///: END:ONLY_INCLUDE_IF

  let asset = token && isEvmNetworkSelected ? evmAsset : nonEvmAsset;

  const primaryCurrency = useSelector(
    (state: RootState) => state.settings.primaryCurrency,
  );
  const currentCurrency = useSelector(selectCurrentCurrency);
  const showFiatOnTestnets = useSelector(selectShowFiatInTestnets);

  // Market data selectors
  const exchangeRates = useSelector((state: RootState) =>
    asset?.chainId && asset?.address
      ? selectSingleTokenPriceMarketData(
          state,
          asset.chainId as Hex,
          asset.address as Hex,
        )
      : undefined,
  );

  // Token balance selectors
  const tokenBalances = useSelector((state: RootState) =>
    selectedInternalAccountAddress && asset?.chainId && asset?.address
      ? selectSingleTokenBalance(
          state,
          selectedInternalAccountAddress as Hex,
          asset.chainId as Hex,
          asset.address as Hex,
        )
      : undefined,
  );

  const conversionRate = useSelector((state: RootState) =>
    asset?.chainId
      ? selectCurrencyRateForChainId(state, asset.chainId as Hex)
      : undefined,
  );

  const oneHundredths = 0.01;
  const oneHundredThousandths = 0.00001;

  const { balanceFiat, balanceValueFormatted } = useMemo(() => {
    if (!token) {
      return {
        balanceFiat: undefined,
        balanceValueFormatted: '',
      };
    }

    if (!asset) {
      return {
        balanceFiat: undefined,
        balanceValueFormatted: '',
      };
    }

    return isEvmNetworkSelected && asset
      ? deriveBalanceFromAssetMarketDetails(
          asset,
          exchangeRates || {},
          tokenBalances || {},
          conversionRate || 0,
          currentCurrency || '',
        )
      : {
          balanceFiat: asset?.balanceFiat
            ? formatWithThreshold(
                parseFloat(asset.balanceFiat),
                oneHundredths,
                I18n.locale,
                { style: 'currency', currency: currentCurrency },
              )
            : TOKEN_BALANCE_LOADING,
          balanceValueFormatted: asset?.balance
            ? formatWithThreshold(
                parseFloat(asset.balance),
                oneHundredThousandths,
                I18n.locale,
                { minimumFractionDigits: 0, maximumFractionDigits: 5 },
              )
            : TOKEN_BALANCE_LOADING,
        };
  }, [
    token,
    isEvmNetworkSelected,
    asset,
    exchangeRates,
    tokenBalances,
    conversionRate,
    currentCurrency,
  ]);

  // render balances according to primary currency
  let mainBalance;
  let secondaryBalance;
  const shouldNotShowBalanceOnTestnets =
    isTestNet(asset?.chainId as Hex) && !showFiatOnTestnets;

  // Set main and secondary balances based on the primary currency and asset type.
  if (primaryCurrency === 'ETH') {
    // TECH_DEBT: this should not be primary currency for multichain, not ETH
    // Default to displaying the formatted balance value and its fiat equivalent.
    mainBalance = balanceValueFormatted?.toUpperCase();
    secondaryBalance = balanceFiat?.toUpperCase();
    // For ETH as a native currency, adjust display based on network safety.
    if (asset?.isETH) {
      // Main balance always shows the formatted balance value for ETH.
      mainBalance = balanceValueFormatted?.toUpperCase();
      // Display fiat value as secondary balance only for original native tokens on safe networks.
      secondaryBalance = shouldNotShowBalanceOnTestnets
        ? undefined
        : balanceFiat?.toUpperCase();
    }
  } else {
    secondaryBalance = balanceValueFormatted?.toUpperCase();
    if (shouldNotShowBalanceOnTestnets && !balanceFiat) {
      mainBalance = undefined;
    } else {
      mainBalance =
        balanceFiat ?? strings('wallet.unable_to_find_conversion_rate');
    }
  }

  if (evmAsset?.hasBalanceError) {
    mainBalance = evmAsset.symbol;
    secondaryBalance = strings('wallet.unable_to_load');
  }

  if (balanceFiat === TOKEN_RATE_UNDEFINED) {
    mainBalance = balanceValueFormatted;
    secondaryBalance = strings('wallet.unable_to_find_conversion_rate');
  }

  asset = asset && { ...asset, balanceFiat, isStaked: asset?.isStaked };

  return {
    asset,
    mainBalance,
    balanceFiat,
    secondaryBalance,
  };
};

export default useAssetBalance;
