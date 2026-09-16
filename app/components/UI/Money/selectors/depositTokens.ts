import type { Asset } from '@metamask/assets-controllers';
import { TransactionType } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import {
  getBlockedTokensForTransactionType,
  isTokenBlocked,
} from '../../../Views/confirmations/utils/transaction-pay';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { selectMetaMaskPayTokensFlags } from '../../../../selectors/featureFlagController/confirmations';
import { createDeepEqualSelector } from '../../../../selectors/util';
import { selectMoneyDepositMinBalance } from './featureFlags';

/** EVM wallet asset eligible to fund a Money account deposit. */
export type MoneyDepositAsset = Asset & {
  address: Hex;
  chainId: Hex;
};

export interface MoneyDepositToken {
  address: string;
  chainId?: string;
}

export type MoneyDepositBlockedTokens = ReturnType<
  typeof getBlockedTokensForTransactionType
>;

const hasBalance = (asset: MoneyDepositAsset) =>
  Number(asset.fiat?.balance ?? 0) > 0 ||
  (asset.rawBalance !== undefined && asset.rawBalance !== '0x0');

export const isMoneyDepositAsset = (asset: Asset): asset is MoneyDepositAsset =>
  'address' in asset &&
  typeof asset.address === 'string' &&
  asset.address.length > 0 &&
  typeof asset.chainId === 'string' &&
  asset.chainId.length > 0 &&
  asset.accountType?.startsWith('eip155:') === true;

/**
 * Returns whether a token can be used as a Money deposit source regardless of
 * its current balance.
 */
export const isMoneyDepositSupportedToken = (
  token: MoneyDepositToken,
  blockedTokens?: MoneyDepositBlockedTokens,
): boolean =>
  token.chainId?.startsWith('0x') === true &&
  token.address.length > 0 &&
  !isTokenBlocked(token, blockedTokens);

const meetsMinimumBalance = (
  asset: MoneyDepositAsset,
  minimumBalance: number,
) => {
  const fiatBalance = asset.fiat?.balance;
  return (
    fiatBalance !== undefined &&
    fiatBalance !== null &&
    Number.isFinite(Number(fiatBalance)) &&
    Number(fiatBalance) >= minimumBalance
  );
};

export const filterMoneyDepositSupportedAssets = (
  assets: readonly Asset[],
  blockedTokens: MoneyDepositBlockedTokens,
): MoneyDepositAsset[] =>
  assets
    .filter(isMoneyDepositAsset)
    .filter((asset) => !isTokenBlocked(asset, blockedTokens));

export const selectMoneyDepositBlockedTokens = createDeepEqualSelector(
  [selectMetaMaskPayTokensFlags],
  (payTokenFlags) =>
    getBlockedTokensForTransactionType(
      payTokenFlags.blockedTokens,
      TransactionType.moneyAccountDeposit,
    ),
);

export const selectMoneyDepositAssetsMeetingMinimumBalance =
  createDeepEqualSelector(
    [
      selectAssetsBySelectedAccountGroup,
      selectMoneyDepositBlockedTokens,
      selectMoneyDepositMinBalance,
    ],
    (assetsByChain, blockedTokens, minimumBalance) =>
      filterMoneyDepositSupportedAssets(
        Object.values(assetsByChain).flat() as Asset[],
        blockedTokens,
      )
        .filter(
          (asset) =>
            hasBalance(asset) && meetsMinimumBalance(asset, minimumBalance),
        )
        .sort(
          (first, second) =>
            (second.fiat?.balance ?? 0) - (first.fiat?.balance ?? 0),
        ),
  );
