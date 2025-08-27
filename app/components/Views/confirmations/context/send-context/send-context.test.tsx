import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { useSelector } from 'react-redux';
import { isAddress } from 'ethers/lib/utils';

import { AssetType, TokenStandard } from '../../types/token';
import { useSendContext, SendContextProvider } from './send-context';
import { useSendScope } from '../../hooks/send/useSendScope';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('ethers/lib/utils', () => ({
  isAddress: jest.fn(),
}));

jest.mock('../../hooks/send/useSendScope', () => ({
  useSendScope: jest.fn(),
}));

const mockUseSelector = jest.mocked(useSelector);
const mockIsEvmAddress = jest.mocked(isAddress);
const mockuseSendScope = jest.mocked(useSendScope);

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

  const mockAccounts = {
    account1: mockAccount1,
    account2: mockAccount2,
  };

  const mockSelectedAccount = {
    id: 'selectedAccount',
    address: '0x789',
    type: 'eip155:eoa',
    options: {},
    methods: [],
    metadata: {
      name: 'Selected Account',
      keyring: { type: 'HD Key Tree' },
    },
  } as unknown as InternalAccount;

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

  const mockAssetNonEvm: AssetType = {
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
    accountId: 'account2',
  };

  const wrapper = ({ children }: { children: React.ReactElement }) => (
    <SendContextProvider>{children}</SendContextProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(mockAccounts);
    mockIsEvmAddress.mockReturnValue(false);
    mockuseSendScope.mockReturnValue({
      account: mockSelectedAccount,
      isEvm: true,
      isSolana: false,
    });
  });

  it('provides initial context values', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    expect(result.current).toStrictEqual({
      asset: undefined,
      chainId: undefined,
      fromAccount: undefined,
      from: undefined,
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

  it('updates fromAccount when asset has different accountId', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    expect(result.current.fromAccount).toEqual(mockAccount1);
    expect(result.current.from).toBe('0x123');
  });

  it('uses selectedAccount when asset has same accountId', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    act(() => {
      result.current.updateAsset({ ...mockAssetEvm, name: 'Updated Token' });
    });

    expect(result.current.fromAccount).toEqual(mockSelectedAccount);
    expect(result.current.from).toBe('0x789');
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
      result.current.updateAsset(mockAssetNonEvm);
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

  it('uses selectedAccount when asset has no accountId', () => {
    const assetWithoutAccountId = { ...mockAssetEvm, accountId: undefined };

    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(assetWithoutAccountId);
    });

    expect(result.current.fromAccount).toEqual(mockSelectedAccount);
    expect(result.current.from).toBe('0x789');
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
      result.current.updateAsset(mockAssetNonEvm);
    });

    expect(result.current.fromAccount).toEqual(mockAccount2);
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

  it('uses selectedAccount when asset accountId matches current fromAccount', () => {
    const { result } = renderHook(() => useSendContext(), { wrapper });

    act(() => {
      result.current.updateAsset(mockAssetEvm);
    });

    act(() => {
      result.current.updateAsset({
        ...mockAssetEvm,
        name: 'Same Account Asset',
      });
    });

    expect(result.current.fromAccount).toEqual(mockSelectedAccount);
    expect(result.current.from).toBe('0x789');
  });
});
