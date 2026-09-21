import { SolAccountType, SolScope } from '@metamask/keyring-api';
import type { InternalAccount } from '@metamask/keyring-internal-api';

import type { AssetType } from '../../types/token';
import {
  buildSolanaPaySource,
  getSourceAmountRaw,
} from './useTransactionPaySource';

const ACCOUNT_ADDRESS = '7Ec4QeG8wF3RnTjHDrTuYP8hVV7WYuPFyM4hZUodkG6Z';
const ASSET_ID = `${SolScope.Mainnet}/token:USDCMint`;
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

describe('Solana Pay source', () => {
  it('persists only canonical account and asset identity', () => {
    const result = buildSolanaPaySource(token, account);

    expect(result).toEqual({
      sourceAccountId: `${SolScope.Mainnet}:${ACCOUNT_ADDRESS}`,
      sourceAssetId: ASSET_ID,
    });
  });

  it('keeps the wallet-local source amount outside persisted source metadata', () => {
    const result = getSourceAmountRaw(token);

    expect(result).toBe('12500000');
  });
});
