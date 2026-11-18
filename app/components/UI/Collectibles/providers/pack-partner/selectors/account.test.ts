import type { RootState } from '../../../../../../reducers';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { MOCK_INTERNAL_ACCOUNT } from '../../../views/testUtils';
import { SOLANA_USDC_ASSET_ID } from '../constants/packPartner';
import {
  getPackPartnerUsdcAmount,
  selectPackPartnerInternalAccount,
  selectPackPartnerUsdcAmount,
} from './account';

const WALLET_ID = 'entropy:wallet-1';
const GROUP_ID = `${WALLET_ID}/0`;

const createState = ({
  hasAccountGroup = true,
  usdcAmount,
}: {
  hasAccountGroup?: boolean;
  usdcAmount?: string;
} = {}): RootState =>
  ({
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            accounts: { [MOCK_INTERNAL_ACCOUNT.id]: MOCK_INTERNAL_ACCOUNT },
            selectedAccount: MOCK_INTERNAL_ACCOUNT.id,
          },
        },
        AccountTreeController: {
          selectedAccountGroup: hasAccountGroup ? GROUP_ID : '',
          accountTree: {
            wallets: hasAccountGroup
              ? {
                  [WALLET_ID]: {
                    id: WALLET_ID,
                    type: 'entropy',
                    metadata: { name: 'Wallet 1' },
                    groups: {
                      [GROUP_ID]: {
                        id: GROUP_ID,
                        type: 'multichain-account',
                        accounts: [MOCK_INTERNAL_ACCOUNT.id],
                        metadata: { name: 'Account 1' },
                      },
                    },
                  },
                }
              : {},
          },
        },
        AssetsController:
          usdcAmount === undefined
            ? undefined
            : {
                ...backgroundState.AssetsController,
                assetsBalance: {
                  [MOCK_INTERNAL_ACCOUNT.id]: {
                    [SOLANA_USDC_ASSET_ID]: { amount: usdcAmount },
                  },
                },
              },
      },
    },
  }) as unknown as RootState;

describe('selectPackPartnerInternalAccount', () => {
  it('returns the Solana account of the selected account group', () => {
    expect(selectPackPartnerInternalAccount(createState())).toBe(
      MOCK_INTERNAL_ACCOUNT,
    );
  });

  it('returns undefined without a selected account group', () => {
    expect(
      selectPackPartnerInternalAccount(createState({ hasAccountGroup: false })),
    ).toBeUndefined();
  });
});

describe('getPackPartnerUsdcAmount', () => {
  const assetsBalance = {
    [MOCK_INTERNAL_ACCOUNT.id]: {
      [SOLANA_USDC_ASSET_ID]: { amount: '12.5' },
    },
  };

  it('returns the raw USDC amount of the account', () => {
    expect(
      getPackPartnerUsdcAmount(assetsBalance, MOCK_INTERNAL_ACCOUNT.id),
    ).toBe('12.5');
  });

  it('returns undefined for an unknown or missing account', () => {
    expect(getPackPartnerUsdcAmount(assetsBalance, 'other')).toBeUndefined();
    expect(getPackPartnerUsdcAmount(assetsBalance, undefined)).toBeUndefined();
  });
});

describe('selectPackPartnerUsdcAmount', () => {
  it('returns the USDC amount of the selected Solana account', () => {
    expect(selectPackPartnerUsdcAmount(createState({ usdcAmount: '42' }))).toBe(
      '42',
    );
  });

  it('returns undefined before AssetsController state exists', () => {
    expect(selectPackPartnerUsdcAmount(createState())).toBeUndefined();
  });

  it('returns undefined without a Solana account', () => {
    expect(
      selectPackPartnerUsdcAmount(
        createState({ hasAccountGroup: false, usdcAmount: '42' }),
      ),
    ).toBeUndefined();
  });
});
