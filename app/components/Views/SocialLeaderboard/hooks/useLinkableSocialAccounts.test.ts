import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  selectInternalAccountsById,
  selectInternalEvmAccounts,
} from '../../../../selectors/accountsController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { selectEVMEnabledNetworks } from '../../../../selectors/networkEnablementController';
import { selectAllAccountGroupIconSeedAddresses } from '../../../../selectors/multichainAccounts/accounts';
import { selectVisibleAccountGroupsByWallet } from '../../../../selectors/multichainAccounts/manageAccounts';
import { useGetTotalFiatBalanceCrossChains } from '../../../hooks/useGetTotalFiatBalanceCrossChains';
import { renderShortAddress } from '../../../../util/address';
import { useLinkableSocialAccounts } from './useLinkableSocialAccounts';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../hooks/useGetFormattedTokensPerChain', () => ({
  useGetFormattedTokensPerChain: () => ({}),
}));

jest.mock('../../../hooks/useGetTotalFiatBalanceCrossChains', () => ({
  useGetTotalFiatBalanceCrossChains: jest.fn(),
}));

const EVM_ADDRESS_1 = '0x1111111111111111111111111111111111111111';
const EVM_ADDRESS_2 = '0x2222222222222222222222222222222222222222';
const SOLANA_ADDRESS = 'So11111111111111111111111111111111111111112';
const GROUP_1_SOLANA_ADDRESS = '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
const SOLANA_MAINNET = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

const evmAccount1 = {
  id: 'evm-1',
  address: EVM_ADDRESS_1,
  type: 'eip155:eoa',
  scopes: ['eip155:0'],
  metadata: { name: 'Internal One' },
};
const evmAccount2 = {
  id: 'evm-2',
  address: EVM_ADDRESS_2,
  type: 'eip155:eoa',
  scopes: ['eip155:0'],
  metadata: { name: '' },
};
const group1SolanaAccount = {
  id: 'sol-group-1',
  address: GROUP_1_SOLANA_ADDRESS,
  type: 'solana:data-account',
  scopes: [SOLANA_MAINNET],
  metadata: { name: 'Solana Account 1' },
};
const solanaAccount = {
  id: 'sol-1',
  address: SOLANA_ADDRESS,
  type: 'solana:data-account',
  scopes: [SOLANA_MAINNET],
  metadata: { name: 'Solana' },
};

interface SelectorValues {
  evmAccounts: unknown[];
  accountsById: Record<string, unknown>;
  accountSections: unknown[];
  seedAddressByGroupId: Record<string, string>;
}

const mockSelectors = ({
  evmAccounts,
  accountsById,
  accountSections,
  seedAddressByGroupId,
}: SelectorValues) => {
  const values = new Map<unknown, unknown>([
    [selectInternalEvmAccounts, evmAccounts],
    [selectInternalAccountsById, accountsById],
    [selectVisibleAccountGroupsByWallet, accountSections],
    [selectAllAccountGroupIconSeedAddresses, seedAddressByGroupId],
    [selectEVMEnabledNetworks, []],
    [selectCurrentCurrency, 'usd'],
  ]);
  (useSelector as jest.Mock).mockImplementation((selector) =>
    values.get(selector),
  );
};

const defaultSelectors: SelectorValues = {
  evmAccounts: [evmAccount1, evmAccount2],
  accountsById: {
    [evmAccount1.id]: evmAccount1,
    [evmAccount2.id]: evmAccount2,
    [group1SolanaAccount.id]: group1SolanaAccount,
    [solanaAccount.id]: solanaAccount,
  },
  accountSections: [
    {
      title: 'Wallet 1',
      data: [
        {
          id: 'group-1',
          accounts: [evmAccount1.id, group1SolanaAccount.id],
          metadata: { name: 'Account 1' },
        },
        { id: 'group-2', accounts: [evmAccount2.id], metadata: { name: '' } },
        {
          id: 'group-sol',
          accounts: [solanaAccount.id],
          metadata: { name: 'Solana only' },
        },
      ],
    },
  ],
  seedAddressByGroupId: {
    'group-1': EVM_ADDRESS_1,
    'group-2': EVM_ADDRESS_2,
    'group-sol': SOLANA_ADDRESS,
  },
};

describe('useLinkableSocialAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGetTotalFiatBalanceCrossChains as jest.Mock).mockReturnValue({
      [EVM_ADDRESS_1]: { totalFiatBalance: 12.5 },
    });
  });

  it('names each row after its account group and resolves it to the EVM account', () => {
    mockSelectors(defaultSelectors);

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[0]).toEqual({
      id: evmAccount1.id,
      name: 'Account 1',
      address: EVM_ADDRESS_1,
      balanceLabel: '$12.50',
      linkedAddresses: [
        `eip155:1:${EVM_ADDRESS_1}`,
        `${SOLANA_MAINNET}:${GROUP_1_SOLANA_ADDRESS}`,
      ],
    });
  });

  it('falls back to the short address when neither the group nor the account has a name', () => {
    mockSelectors(defaultSelectors);

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current[1]).toEqual({
      id: evmAccount2.id,
      name: renderShortAddress(EVM_ADDRESS_2),
      address: EVM_ADDRESS_2,
      balanceLabel: '',
      linkedAddresses: [`eip155:1:${EVM_ADDRESS_2}`],
    });
  });

  it('leaves out groups without an EVM account', () => {
    mockSelectors(defaultSelectors);

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current.map((account) => account.id)).toEqual([
      evmAccount1.id,
      evmAccount2.id,
    ]);
  });

  it('falls back to the internal EVM accounts when there are no account groups', () => {
    mockSelectors({ ...defaultSelectors, accountSections: [] });

    const { result } = renderHook(() => useLinkableSocialAccounts());

    expect(result.current.map((account) => account.name)).toEqual([
      'Internal One',
      renderShortAddress(EVM_ADDRESS_2),
    ]);
  });
});
