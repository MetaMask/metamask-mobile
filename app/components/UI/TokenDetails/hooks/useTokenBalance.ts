import { useSelector } from 'react-redux';
import { Hex , CaipAssetType } from '@metamask/utils';
import { CurrencyRateState } from '@metamask/assets-controllers';
import I18n from '../../../../../locales/i18n';
import { selectAccountsByChainId } from '../../../../selectors/accountTrackerController';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import {
  selectSelectedInternalAccount,
  selectSelectedInternalAccountFormattedAddress,
} from '../../../../selectors/accountsController';
import { safeToChecksumAddress } from '../../../../util/address';
import {
  renderFromTokenMinimalUnit,
  renderFromWei,
  toHexadecimal,
  addCurrencySymbol,
  balanceToFiatNumber,
} from '../../../../util/number';
import { RootState } from '../../../../reducers';
import { TokenI } from '../../Tokens/types';
import { formatWithThreshold } from '../../../../util/assets';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
import { isEvmAccountType, KeyringAccountType } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF
import { selectMultichainAccountsState2Enabled } from '../../../../selectors/featureFlagController/multichainAccounts';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import {
  selectTronResourcesBySelectedAccountGroup,
  selectAsset,
} from '../../../../selectors/assets/assets-list';
import { createStakedTrxAsset } from '../../AssetOverview/utils/createStakedTrxAsset';
///: END:ONLY_INCLUDE_IF

export interface UseTokenBalanceResult {
  balance: string | number | undefined;
  mainBalance: string;
  secondaryBalance: string | undefined;
  itemAddress: string | undefined;
  isNonEvmAsset: boolean;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  isTronNative: boolean;
  stakedTrxAsset: TokenI | undefined;
  ///: END:ONLY_INCLUDE_IF
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  multichainAssetRates:
    | {
        rate: number;
        marketData: undefined;
      }
    | undefined;
  ///: END:ONLY_INCLUDE_IF
}

export interface UseTokenBalanceParams {
  asset: TokenI;
  currentPrice: number;
  currentCurrency: string;
  nativeCurrency: string;
  marketDataRate: number | undefined;
  conversionRateByTicker: CurrencyRateState['currencyRates'] | undefined;
}

/**
 * Hook that handles balance calculation for different asset types.
 * Supports EVM, non-EVM, multichain, and Tron assets.
 */
export const useTokenBalance = ({
  asset,
  currentCurrency,
  nativeCurrency,
  marketDataRate,
  conversionRateByTicker,
}: UseTokenBalanceParams): UseTokenBalanceResult => {
  const chainId = asset.chainId as Hex;

  // Determine if asset is EVM or non-EVM
  const resultChainId = formatChainIdToCaip(chainId);
  const isNonEvmAsset = resultChainId === asset.chainId;

  // Selectors
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const selectedInternalAccountAddress = selectedInternalAccount?.address;
  const accountsByChainId = useSelector(selectAccountsByChainId);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const multiChainTokenBalance = useSelector(selectTokensBalances);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const multichainAssetRates =
    multichainAssetsRates?.[asset.address as CaipAssetType];
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);
  const strxEnergy = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-energy',
  );
  const strxBandwidth = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-bandwidth',
  );

  const isTronChain = String(asset.chainId).startsWith('tron:');
  const liveAsset = useSelector((state: RootState) =>
    isTronChain && asset.address && asset.chainId
      ? selectAsset(state, {
          address: asset.address,
          chainId: asset.chainId,
          isStaked: false,
        })
      : undefined,
  );

  const isTronNative =
    asset.ticker === 'TRX' && String(asset.chainId).startsWith('tron:');

  const stakedTrxAsset = isTronNative
    ? createStakedTrxAsset(asset, strxEnergy?.balance, strxBandwidth?.balance)
    : undefined;
  ///: END:ONLY_INCLUDE_IF

  // Calculate item address
  const itemAddress = !isNonEvmAsset
    ? safeToChecksumAddress(asset.address)
    : asset.address;

  // Determine balance source
  let balanceSource = asset.balance;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (isTronChain && liveAsset?.balance != null) {
    balanceSource = liveAsset.balance;
  }
  ///: END:ONLY_INCLUDE_IF

  // Calculate balance
  let balance: string | number | undefined;
  const minimumDisplayThreshold = 0.00001;
  const isMultichainAsset = isNonEvmAsset;
  const isEthOrNative = asset.isETH || asset.isNative;

  if (isMultichainAccountsState2Enabled && balanceSource != null) {
    balance = balanceSource;
  } else if (isMultichainAsset) {
    balance = balanceSource
      ? formatWithThreshold(
          parseFloat(balanceSource),
          minimumDisplayThreshold,
          I18n.locale,
          { minimumFractionDigits: 0, maximumFractionDigits: 5 },
        )
      : undefined;
  } else if (isEthOrNative) {
    balance = renderFromWei(
      // @ts-expect-error - This should be fixed at the accountsController selector level
      accountsByChainId[toHexadecimal(chainId)]?.[selectedAddress]?.balance,
    );
  } else {
    const multiChainTokenBalanceHex =
      itemAddress &&
      multiChainTokenBalance?.[selectedInternalAccountAddress as Hex]?.[
        chainId as Hex
      ]?.[itemAddress as Hex];
    const tokenBalanceHex = multiChainTokenBalanceHex;
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    if (
      !isEvmAccountType(selectedInternalAccount?.type as KeyringAccountType)
    ) {
      balance = asset.balance ?? undefined;
    } else {
      ///: END:ONLY_INCLUDE_IF
      balance =
        itemAddress && tokenBalanceHex
          ? renderFromTokenMinimalUnit(tokenBalanceHex, asset.decimals)
          : (asset.balance ?? undefined);
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    }
    ///: END:ONLY_INCLUDE_IF
  }

  // Calculate fiat balance
  let balanceFiatSource = asset.balanceFiat;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  if (isTronChain && liveAsset?.balanceFiat != null) {
    balanceFiatSource = liveAsset.balanceFiat;
  }
  ///: END:ONLY_INCLUDE_IF

  let mainBalance = balanceFiatSource || '';
  if (!mainBalance && balance != null) {
    const balanceNumber =
      typeof balance === 'number' ? balance : parseFloat(String(balance));

    if (balanceNumber > 0 && !isNaN(balanceNumber)) {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (isNonEvmAsset && multichainAssetRates?.rate) {
        const rate = Number(multichainAssetRates.rate);
        const balanceFiatNumber = balanceNumber * rate;
        mainBalance =
          balanceFiatNumber >= 0.01 || balanceFiatNumber === 0
            ? addCurrencySymbol(balanceFiatNumber, currentCurrency)
            : `< ${addCurrencySymbol('0.01', currentCurrency)}`;
      } else if (!isNonEvmAsset) {
        ///: END:ONLY_INCLUDE_IF
        const tickerConversionRate =
          conversionRateByTicker?.[nativeCurrency]?.conversionRate;

        if (
          tickerConversionRate &&
          marketDataRate !== undefined &&
          isFinite(marketDataRate)
        ) {
          const balanceFiatNumber = balanceToFiatNumber(
            balanceNumber,
            tickerConversionRate,
            marketDataRate,
          );
          if (isFinite(balanceFiatNumber)) {
            mainBalance =
              balanceFiatNumber >= 0.01 || balanceFiatNumber === 0
                ? addCurrencySymbol(balanceFiatNumber, currentCurrency)
                : `< ${addCurrencySymbol('0.01', currentCurrency)}`;
          }
        }
        ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      }
      ///: END:ONLY_INCLUDE_IF
    }
  }

  const secondaryBalance =
    balance != null
      ? `${balance} ${asset.isETH ? asset.ticker : asset.symbol}`
      : undefined;

  // Calculate multichain asset rates for price calculation
  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const convertedMultichainAssetRates =
    isNonEvmAsset && multichainAssetRates
      ? {
          rate: Number(multichainAssetRates.rate),
          marketData: undefined,
        }
      : undefined;
  ///: END:ONLY_INCLUDE_IF

  return {
    balance,
    mainBalance,
    secondaryBalance,
    itemAddress,
    isNonEvmAsset,
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    isTronNative,
    stakedTrxAsset,
    ///: END:ONLY_INCLUDE_IF
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    multichainAssetRates: convertedMultichainAssetRates,
    ///: END:ONLY_INCLUDE_IF
  };
};

export default useTokenBalance;
