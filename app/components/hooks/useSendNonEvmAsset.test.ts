/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSendNonEvmAsset } from './useSendNonEvmAsset';
import { InitSendLocation } from '../Views/confirmations/constants/send';
import { sendMultichainTransaction } from '../../core/SnapKeyring/utils/sendMultichainTransaction';
import { isMultichainWalletSnap } from '../../core/SnapKeyring/utils/snaps';
import { isEvmAccountType } from '@metamask/keyring-api';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';

// Mock dependencies
jest.mock('../../core/SnapKeyring/utils/sendMultichainTransaction');
jest.mock('../../core/SnapKeyring/utils/snaps');
jest.mock('@metamask/keyring-api');
jest.mock('../../util/Logger');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

const mockedSendMultichainTransaction =
  sendMultichainTransaction as jest.MockedFunction<
    typeof sendMultichainTransaction
  >;
const mockedIsMultichainWalletSnap =
  isMultichainWalletSnap as jest.MockedFunction<typeof isMultichainWalletSnap>;
const mockedIsEvmAccountType = isEvmAccountType as jest.MockedFunction<
  typeof isEvmAccountType
>;

describe('useSendNonEvmAsset', () => {
  const mockAsset = {
    address: 'test-token-address',
    aggregators: [],
    balance: '400',
    balanceFiat: '1500',
    chainId: 'solana:mainnet',
    decimals: 18,
    hasBalanceError: false,
    image: '',
    isETH: undefined,
    isNative: true,
    logo: 'https://upload.wikimedia.org/wikipedia/commons/0/05/Ethereum_logo_2014.svg',
    name: 'Ethereum',
    symbol: 'ETH',
  };

  const mockCloseModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('EVM Account Handling', () => {
    it('should return false for EVM account', async () => {
      mockedIsEvmAccountType.mockReturnValue(true);

      const mockState = {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'evm-account-id',
                accounts: {
                  'evm-account-id': {
                    id: 'evm-account-id',
                    type: 'eip155:eoa',
                    metadata: {},
                  },
                },
              },
            },
          },
        },
      } as any;

      const { result } = renderHookWithProvider(
        () =>
          useSendNonEvmAsset({ asset: mockAsset, closeModal: mockCloseModal }),
        { state: mockState },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(false);
      expect(mockCloseModal).not.toHaveBeenCalled();
      expect(mockedSendMultichainTransaction).not.toHaveBeenCalled();
    });

    it('should return false when no account is selected', async () => {
      const mockState = {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                selectedAccount: undefined,
                accounts: {},
              },
            },
          },
        },
      } as any;

      const { result } = renderHookWithProvider(
        () =>
          useSendNonEvmAsset({ asset: mockAsset, closeModal: mockCloseModal }),
        { state: mockState },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(false);
      expect(mockCloseModal).not.toHaveBeenCalled();
      expect(mockedSendMultichainTransaction).not.toHaveBeenCalled();
    });

    it('should correctly identify non-EVM account', () => {
      mockedIsEvmAccountType.mockReturnValue(false);

      const mockState = {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'non-evm-account-id',
                accounts: {
                  'non-evm-account-id': {
                    id: 'non-evm-account-id',
                    type: 'snap',
                    metadata: {
                      snap: {
                        id: 'test-snap-id',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      } as any;

      const { result } = renderHookWithProvider(
        () =>
          useSendNonEvmAsset({ asset: mockAsset, closeModal: mockCloseModal }),
        { state: mockState },
      );

      expect(result.current.isNonEvmAccount).toBe(true);
    });

    it('should correctly identify EVM account', () => {
      mockedIsEvmAccountType.mockReturnValue(true);

      const mockState = {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'evm-account-id',
                accounts: {
                  'evm-account-id': {
                    id: 'evm-account-id',
                    type: 'eip155:eoa',
                    metadata: {},
                  },
                },
              },
            },
          },
        },
      } as any;

      const { result } = renderHookWithProvider(
        () =>
          useSendNonEvmAsset({ asset: mockAsset, closeModal: mockCloseModal }),
        { state: mockState },
      );

      expect(result.current.isNonEvmAccount).toBe(false);
    });
  });

  describe('Non-EVM Account Handling', () => {
    const mockState = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              selectedAccount: 'non-evm-account-id',
              accounts: {
                'non-evm-account-id': {
                  id: 'non-evm-account-id',
                  type: 'snap',
                  metadata: {
                    snap: {
                      id: 'test-snap-id',
                    },
                  },
                },
              },
            },
          },
        },
      },
    } as any;

    beforeEach(() => {
      mockedIsEvmAccountType.mockReturnValue(false);
    });

    it('should handle successful non-EVM transaction', async () => {
      mockedIsMultichainWalletSnap.mockReturnValue(true);
      mockedSendMultichainTransaction.mockResolvedValue(undefined);

      const { result } = renderHookWithProvider(
        () =>
          useSendNonEvmAsset({ asset: mockAsset, closeModal: mockCloseModal }),
        { state: mockState },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(true);
      expect(mockCloseModal).toHaveBeenCalledTimes(1);
      expect(mockedSendMultichainTransaction).toHaveBeenCalledWith(
        'test-snap-id',
        {
          account: 'non-evm-account-id',
          scope: 'solana:mainnet',
          assetId: 'test-token-address',
        },
      );
    });

    it('should handle missing snap metadata', async () => {
      const stateWithoutSnap = {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                selectedAccount: 'non-evm-account-id',
                accounts: {
                  'non-evm-account-id': {
                    id: 'non-evm-account-id',
                    type: 'snap',
                    metadata: {},
                  },
                },
              },
            },
          },
        },
      } as any;

      const { result } = renderHookWithProvider(
        () =>
          useSendNonEvmAsset({ asset: mockAsset, closeModal: mockCloseModal }),
        { state: stateWithoutSnap },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(true);
      expect(mockCloseModal).toHaveBeenCalledTimes(1);
      expect(mockedSendMultichainTransaction).not.toHaveBeenCalled();
    });

    it('should handle non-whitelisted snap', async () => {
      mockedIsMultichainWalletSnap.mockReturnValue(false);

      const { result } = renderHookWithProvider(
        () =>
          useSendNonEvmAsset({ asset: mockAsset, closeModal: mockCloseModal }),
        { state: mockState },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(true);
      expect(mockCloseModal).toHaveBeenCalledTimes(1);
      expect(mockedSendMultichainTransaction).not.toHaveBeenCalled();
    });

    it('should handle sendMultichainTransaction error', async () => {
      const mockError = new Error('Transaction failed');
      mockedIsMultichainWalletSnap.mockReturnValue(true);
      mockedSendMultichainTransaction.mockRejectedValue(mockError);

      const { result } = renderHookWithProvider(
        () =>
          useSendNonEvmAsset({ asset: mockAsset, closeModal: mockCloseModal }),
        { state: mockState },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(true);
      expect(mockCloseModal).toHaveBeenCalledTimes(1);
      expect(mockedSendMultichainTransaction).toHaveBeenCalled();
    });

    it('should work without closeModal callback', async () => {
      mockedIsMultichainWalletSnap.mockReturnValue(true);
      mockedSendMultichainTransaction.mockResolvedValue(undefined);

      const { result } = renderHookWithProvider(
        () => useSendNonEvmAsset({ asset: mockAsset }),
        { state: mockState },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(true);
      expect(mockedSendMultichainTransaction).toHaveBeenCalled();
    });
  });
});
