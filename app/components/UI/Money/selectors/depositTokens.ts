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

const hasBalance = (asset: MoneyDepositAsset) =>
  Number(asset.fiat?.balance ?? 0) > 0 ||
  (asset.rawBalance !== undefined && asset.rawBalance !== '0x0');

const isEvmAsset = (asset: Asset): asset is MoneyDepositAsset =>
  'address' in asset &&
  typeof asset.address === 'string' &&
  asset.address.length > 0 &&
  typeof asset.chainId === 'string' &&
  asset.chainId.length > 0 &&
  asset.accountType?.startsWith('eip155:') === true;

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

export const filterMoneyDepositEligibleAssets = (
  assets: readonly Asset[],
  blockedTokens: ReturnType<typeof getBlockedTokensForTransactionType>,
  minimumBalance: number,
): MoneyDepositAsset[] =>
  assets
    .filter(isEvmAsset)
    .filter(
      (asset) =>
        hasBalance(asset) &&
        !isTokenBlocked(asset, blockedTokens) &&
        meetsMinimumBalance(asset, minimumBalance),
    )
    .sort(
      (first, second) =>
        (second.fiat?.balance ?? 0) - (first.fiat?.balance ?? 0),
    );

export const selectMoneyDepositEligibleAssets = createDeepEqualSelector(
  [
    selectAssetsBySelectedAccountGroup,
    selectMetaMaskPayTokensFlags,
    selectMoneyDepositMinBalance,
  ],
  (assetsByChain, payTokenFlags, minimumBalance) =>
    filterMoneyDepositEligibleAssets(
      Object.values(assetsByChain).flat() as Asset[],
      getBlockedTokensForTransactionType(
        payTokenFlags.blockedTokens,
        TransactionType.moneyAccountDeposit,
      ),
      minimumBalance,
    ),
);
