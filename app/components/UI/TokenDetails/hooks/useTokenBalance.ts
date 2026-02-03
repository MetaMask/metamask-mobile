import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';
import { RootState } from '../../../../reducers';
import { TokenI } from '../../Tokens/types';
import {
  selectAsset,
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  selectTronResourcesBySelectedAccountGroup,
  ///: END:ONLY_INCLUDE_IF
} from '../../../../selectors/assets/assets-list';
import { toChecksumAddress } from '../../../../util/address';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { createStakedTrxAsset } from '../../AssetOverview/utils/createStakedTrxAsset';
///: END:ONLY_INCLUDE_IF

// Only checksum valid EVM addresses (0x prefix, 42 chars)
// Returns original address for non-EVM chains (Tron, Solana, etc.)
const normalizeAddress = (address: string): string => {
  if (address?.startsWith('0x') && address.length === 42) {
    return toChecksumAddress(address);
  }
  return address;
};

export interface UseTokenBalanceResult {
  balance: string | undefined;
  fiatBalance: string | undefined;
  tokenFormattedBalance: string | undefined;
  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  isTronNative: boolean;
  stakedTrxAsset: TokenI | undefined;
  ///: END:ONLY_INCLUDE_IF
}

export const useTokenBalance = (token: TokenI): UseTokenBalanceResult => {
  const processedAsset = useSelector((state: RootState) =>
    selectAsset(state, {
      address: normalizeAddress(token.address),
      chainId: token.chainId as Hex,
      isStaked: Boolean(token.isStaked),
    }),
  );

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);
  const strxEnergy = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-energy',
  );
  const strxBandwidth = tronResources.find(
    (a) => a.symbol.toLowerCase() === 'strx-bandwidth',
  );

  const isTronNative =
    token.ticker === 'TRX' && String(token.chainId).startsWith('tron:');

  const stakedTrxAsset = isTronNative
    ? createStakedTrxAsset(token, strxEnergy?.balance, strxBandwidth?.balance)
    : undefined;
  ///: END:ONLY_INCLUDE_IF

  const balance = processedAsset?.balance;

  return {
    balance,
    fiatBalance: processedAsset?.balanceFiat,
    tokenFormattedBalance: balance
      ? `${balance} ${processedAsset.symbol}`
      : undefined,
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    isTronNative,
    stakedTrxAsset,
    ///: END:ONLY_INCLUDE_IF
  };
};

export default useTokenBalance;
