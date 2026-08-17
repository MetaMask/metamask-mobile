import type { Asset } from '@metamask/assets-controllers';
import { TransactionType } from '@metamask/transaction-controller';
import type { AssetType } from '../../../Views/confirmations/types/token';
import {
  getBlockedTokensForTransactionType,
  isTokenBlocked,
} from '../../../Views/confirmations/utils/transaction-pay';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { selectMetaMaskPayTokensFlags } from '../../../../selectors/featureFlagController/confirmations';
import { createDeepEqualSelector } from '../../../../selectors/util';
import { selectMoneyDepositMinBalance } from './featureFlags';

const hasBalance = (asset: AssetType) =>
  Number(asset.fiat?.balance ?? 0) > 0 ||
  (asset.rawBalance !== undefined && asset.rawBalance !== '0x0');

const isEvmAsset = (
  asset: Asset,
): asset is Asset & { address: string; chainId: string } =>
  'address' in asset &&
  Boolean(asset.address) &&
  Boolean(asset.accountType?.includes('eip155'));

const meetsMinimumBalance = (asset: AssetType, minimumBalance: number) => {
  const fiatBalance = asset.fiat?.balance;
  return (
    fiatBalance !== undefined &&
    fiatBalance !== null &&
    Number.isFinite(Number(fiatBalance)) &&
    Number(fiatBalance) >= minimumBalance
  );
};

export const getMoneyDepositAssetKey = ({
  address,
  chainId,
}: Pick<AssetType, 'address' | 'chainId'>) =>
  `${chainId?.toLowerCase() ?? ''}:${address?.toLowerCase()}`;

export const filterMoneyDepositEligibleAssets = (
  assets: readonly Asset[],
  blockedTokens: ReturnType<typeof getBlockedTokensForTransactionType>,
  minimumBalance: number,
): AssetType[] =>
  assets
    .filter(isEvmAsset)
    .map((asset) => asset as unknown as AssetType)
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
