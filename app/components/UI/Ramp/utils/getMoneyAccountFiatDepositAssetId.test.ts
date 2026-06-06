import { MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID } from './getMoneyAccountFiatDepositAssetId';

describe('MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID', () => {
  it('is native ETH on mainnet in CAIP-19 slip44 form', () => {
    // Mirrors core's ETH_MAINNET_FIAT_ASSET (getFiatAssetPerTransactionType
    // fallback for moneyAccountDeposit). Native tokens render as slip44:60.
    expect(MONEY_ACCOUNT_FIAT_DEPOSIT_ASSET_ID).toBe('eip155:1/slip44:60');
  });
});
