import { useSelector } from 'react-redux';
import { Hex, CaipAssetType } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import { TokenI } from '../../Tokens/types';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import {
  selectAsset,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  selectTronResourcesBySelectedAccountGroup,
  ///: END:ONLY_INCLUDE_IF
} from '../../../../selectors/assets/assets-list';
import { safeToChecksumAddress } from '../../../../util/address';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { selectMultichainAssetsRates } from '../../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { createStakedTrxAsset } from '../../AssetOverview/utils/createStakedTrxAsset';
///: END:ONLY_INCLUDE_IF

export interface UseTokenBalanceResult {
  balance: string | undefined;
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

/**
 * Hook that provides balance data for a token using the selectAsset selector.
 * Supports EVM, non-EVM, multichain, and Tron assets.
 */
export const useTokenBalance = (asset: TokenI): UseTokenBalanceResult => {
  const chainId = asset.chainId as Hex;

  // Determine if asset is EVM or non-EVM
  const resultChainId = formatChainIdToCaip(chainId);
  const isNonEvmAsset = resultChainId === asset.chainId;

  // Calculate item address
  const itemAddress = !isNonEvmAsset
    ? safeToChecksumAddress(asset.address)
    : asset.address;

  // Fetch live asset data from selector (provides formatted balance and balanceFiat)
  const liveAsset = useSelector((state: RootState) =>
    asset.address && asset.chainId
      ? selectAsset(state, {
          address: asset.address,
          chainId: asset.chainId,
          isStaked: false,
        })
      : undefined,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const multichainAssetRates =
    multichainAssetsRates?.[asset.address as CaipAssetType];

  const convertedMultichainAssetRates =
    isNonEvmAsset && multichainAssetRates
      ? {
          rate: Number(multichainAssetRates.rate),
          marketData: undefined,
        }
      : undefined;
  ///: END:ONLY_INCLUDE_IF

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);
  const strxEnergy = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-energy',
  );
  const strxBandwidth = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-bandwidth',
  );

  const isTronNative =
    asset.ticker === 'TRX' && String(asset.chainId).startsWith('tron:');

  const stakedTrxAsset = isTronNative
    ? createStakedTrxAsset(asset, strxEnergy?.balance, strxBandwidth?.balance)
    : undefined;
  ///: END:ONLY_INCLUDE_IF

  // Use live asset data if available, otherwise fall back to passed asset
  const balance = liveAsset?.balance ?? asset.balance;
  const mainBalance = liveAsset?.balanceFiat ?? asset.balanceFiat ?? '';
  const secondaryBalance =
    balance != null
      ? `${balance} ${asset.isETH ? asset.ticker : asset.symbol}`
      : undefined;

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
