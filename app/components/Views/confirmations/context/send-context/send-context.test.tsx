import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useSelector } from 'react-redux';
import { isAddress } from 'ethers/lib/utils';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { isEvmAccountType } from '@metamask/keyring-api';

import { AssetType, TokenStandard } from '../../types/token';
import { useSendContext, SendContextProvider } from './send-context';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('ethers/lib/utils', () => ({
  isAddress: jest.fn(),
}));

jest.mock('@metamask/bridge-controller', () => ({
  isSolanaChainId: jest.fn(),
}));

jest.mock('@metamask/keyring-api', () => ({
  ...jest.requireActual('@metamask/keyring-api'),
  isEvmAccountType: jest.fn(),
}));

jest.mock('../../../../../core/Multichain/utils', () => ({
  isSolanaAccount: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockIsEvmAddress = jest.mocked(isAddress);
const mockIsSolanaChainId = jest.mocked(isSolanaChainId);
const mockIsEvmAccountType = jest.mocked(isEvmAccountType);

describe('useSendContext', () => {
  const mockAccount1 = {
    id: 'account1',
    address: '0x123',
    type: 'eip155:eoa',
    options: {},
    methods: [],
    metadata: {
      name: 'Account 1',
      keyring: { type: 'HD Key Tree' },
    },
  } as unknown as InternalAccount;

  const mockAccount2 = {
    id: 'account2',
    address: '0x456',
    type: 'eip155:eoa',
    options: {},
    methods: [],
    metadata: {
      name: 'Account 2',
      keyring: { type: 'HD Key Tree' },
    },
  } as unknown as InternalAccount;

  const mockSolanaAccount = {
    id: 'solanaAccount',
    address: 'solana-address',
    type: 'solana:default',
    options: {},
    methods: [],
    metadata: {
      name: 'Solana Account',
      keyring: { type: 'Solana Keyring' },
    },
  } as unknown as InternalAccount;

  const mockAccounts = {
    account1: mockAccount1,
    account2: mockAccount2,
    solanaAccount: mockSolanaAccount,
  };

  const mockSelectedGroup = {
    id: 'group1',
    accounts: ['account1', 'solanaAccount'],
  };

  const mockAssetEvm: AssetType = {
    address: '0xtoken',
    aggregators: [],
    decimals: 18,
    image: '',
    name: 'Test Token',
    symbol: 'TST',
    balance: '100',
    logo: '',
    isETH: false,
    chainId: '1',
    accountId: 'account1',
    standard: TokenStandard.ERC20,
  };

  const mockAssetSolana: AssetType = {
    address: 'solana-token',
    aggregators: [],
    decimals: 9,
    image: '',
    name: 'Solana Token',
    symbol: 'SOL',
    balance: '50',
    logo: '',
    isETH: false,
    chainId: 'solana:mainnet',
    accountId: 'solanaAccount',
  };

  const wrapper = ({ children }: { children: React.ReactElement }) => (
    <SendContextProvider>{children}</SendContextProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector
      .mockReturnValueOnce(mockAccounts)
      .mockReturnValueOnce(mockSelectedGroup)
      .mockReturnValueOnce(mockAccounts)
      .mockReturnValueOnce(mockSelectedGroup)
      .mockReturnValueOnce(mockAccounts)
      .mockReturnValueOnce(mockSelectedGroup)
      .mockReturnValueOnce(mockAccounts)
      .mockReturnValueOnce(mockSelectedGroup);
    mockIsEvmAddress.mockReturnValue(false);
    mockIsSolanaChainId.mockReturnValue(false);
    mockIsEvmAccountType.mockReturnValue(true);
  });

  it('provides initial context values', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    expect(result.current).toStrictEqual({
      asset: undefined,
      chainId: undefined,
      fromAccount: undefined,
      from: undefined,
      maxValueMode: false,
      to: undefined,
      updateAsset: expect.any(Function),
      updateTo: expect.any(Function),
      updateValue: expect.any(Function),
      value: undefined,
    });
  });

  it('updates asset when calling updateAsset', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    expect(result.current.asset).toEqual(mockAssetEvm);
  });

  it('reset amount and maxMode when calling updateAsset', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateValue('10', false);
      result.current.updateAsset(mockAssetEvm);
    });

    expect(result.current.value).toEqual(undefined);
    expect(result.current.maxValueMode).toEqual(false);
  });

  it('updates to address when calling updateTo', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateTo('0xrecipient');
    });

    expect(result.current.to).toBe('0xrecipient');
  });

  it('updates value when calling updateValue', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateValue('1.5');
    });

    expect(result.current.value).toBe('1.5');
  });

  it('updates fromAccount when asset has accountId', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    expect(result.current.fromAccount).toEqual(mockAccount1);
    expect(result.current.from).toBe('0x123');
  });

  it('updates fromAccount when asset accountId changes', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    expect(result.current.fromAccount).toEqual(mockAccount1);

    act(() => {
      result.current.updateAsset(mockAssetSolana);
    });

    expect(result.current.fromAccount).toEqual(mockSolanaAccount);
  });

  it('computes chainId for EVM assets', () => {
    mockIsEvmAddress.mockReturnValue(true);

    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    expect(result.current.chainId).toBe('0x1');
  });

  it('uses original chainId for non-EVM assets', () => {
    mockIsEvmAddress.mockReturnValue(false);

    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetSolana);
    });

    expect(result.current.chainId).toBe('solana:mainnet');
  });

  it('handles asset without chainId', () => {
    const assetWithoutChainId = { ...mockAssetEvm, chainId: undefined };

    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(assetWithoutChainId);
    });

    expect(result.current.chainId).toBeUndefined();
  });

  it('selects EVM account for EVM asset without accountId', () => {
    mockIsEvmAddress.mockReturnValue(true);
    mockIsEvmAccountType.mockReturnValue(true);
    const assetWithoutAccountId = { ...mockAssetEvm, accountId: undefined };

    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(assetWithoutAccountId);
    });

    expect(result.current.fromAccount).toEqual(mockAccount1);
    expect(result.current.from).toBe('0x123');
  });

  it('clears asset when updateAsset called with undefined', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    expect(result.current.asset).toEqual(mockAssetEvm);

    act(() => {
      result.current.updateAsset(undefined);
    });

    expect(result.current.asset).toBeUndefined();
  });

  it('switches fromAccount when updating to asset with different accountId', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    expect(result.current.fromAccount).toEqual(mockAccount1);

    act(() => {
      result.current.updateAsset(mockAssetSolana);
    });

    expect(result.current.fromAccount).toEqual(mockSolanaAccount);
  });

  it('handles missing account in accounts selector', () => {
    const assetWithMissingAccount = {
      ...mockAssetEvm,
      accountId: 'missing-account',
    };

    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(assetWithMissingAccount);
    });

    expect(result.current.fromAccount).toBeUndefined();
    expect(result.current.from).toBeUndefined();
  });

  it('keeps same account when asset accountId matches current fromAccount', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    expect(result.current.fromAccount).toEqual(mockAccount1);

    act(() => {
      result.current.updateAsset({
        ...mockAssetEvm,
        name: 'Same Account Asset',
      });
    });

    expect(result.current.fromAccount).toEqual(mockAccount1);
  });

  it('handles asset without address for account selection', () => {
    const assetWithoutAddress = {
      ...mockAssetEvm,
      accountId: undefined,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (assetWithoutAddress as any).address;

    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(assetWithoutAddress as AssetType);
    });

    expect(result.current.fromAccount).toBeUndefined();
  });
});
