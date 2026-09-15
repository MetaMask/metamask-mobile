import { SolAccountType, SolScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';

import type { AssetType } from '../../types/token';
import { buildSolanaPayIntent } from './useTransactionPaySource';

const ACCOUNT_ADDRESS = '7Ec4QeG8wF3RnTjHDrTuYP8hVV7WYuPFyM4hZUodkG6Z';
const ASSET_ID = `${SolScope.Mainnet}/token:USDCMint`;

describe('buildSolanaPayIntent', () => {
  it('retains the wallet account and canonical Solana identity tuple', () => {
    const account = {
      address: ACCOUNT_ADDRESS,
      id: 'solana-account-id',
      type: SolAccountType.DataAccount,
    } as InternalAccount;
    const token = {
      accountId: account.id,
      address: ASSET_ID,
      assetId: ASSET_ID,
      balance: '12.5',
      chainId: SolScope.Mainnet,
      decimals: 6,
    } as AssetType;

    const result = buildSolanaPayIntent(token, account);

    expect(result).toEqual({
      sourceAccountId: `${SolScope.Mainnet}:${ACCOUNT_ADDRESS}`,
      sourceAmountRaw: '12500000',
      sourceAssetId: ASSET_ID,
      sourceChainId: SolScope.Mainnet,
      sourceWalletAccountId: 'solana-account-id',
      version: 2,
    });
  });
});
