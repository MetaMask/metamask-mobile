/* eslint-disable @typescript-eslint/no-explicit-any */
import { useSendNonEvmAsset } from './useSendNonEvmAsset';
import { InitSendLocation } from '../Views/confirmations/constants/send';
import { handleSendPageNavigation } from '../Views/confirmations/utils/send';
import { isEvmAccountType } from '@metamask/keyring-api';
import { renderHookWithProvider } from '../../util/test/renderWithProvider';

const mockNavigate = jest.fn();

jest.mock('@metamask/keyring-api');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));
jest.mock('../Views/confirmations/utils/send');

const mockedIsEvmAccountType = isEvmAccountType as jest.MockedFunction<
  typeof isEvmAccountType
>;
const mockedHandleSendPageNavigation =
  handleSendPageNavigation as jest.MockedFunction<
    typeof handleSendPageNavigation
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

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockedHandleSendPageNavigation.mockClear();
  });

  describe('EVM Account Handling', () => {
    it('navigates to send flow for EVM account', async () => {
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
        () => useSendNonEvmAsset({ asset: mockAsset }),
        { state: mockState },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(true);
      expect(mockedHandleSendPageNavigation).toHaveBeenCalledWith(
        mockNavigate,
        {
          location: InitSendLocation.HomePage,
          asset: mockAsset,
        },
      );
    });

    it('navigates to send flow when no account is selected', async () => {
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
        () => useSendNonEvmAsset({ asset: mockAsset }),
        { state: mockState },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(true);
      expect(mockedHandleSendPageNavigation).toHaveBeenCalledWith(
        mockNavigate,
        {
          location: InitSendLocation.HomePage,
          asset: mockAsset,
        },
      );
    });

    it('identifies non-EVM account type', () => {
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
        () => useSendNonEvmAsset({ asset: mockAsset }),
        { state: mockState },
      );

      expect(result.current.isNonEvmAccount).toBe(true);
    });

    it('identifies EVM account type', () => {
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
        () => useSendNonEvmAsset({ asset: mockAsset }),
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

    it('navigates to send flow for non-EVM transaction', async () => {
      const { result } = renderHookWithProvider(
        () => useSendNonEvmAsset({ asset: mockAsset }),
        { state: mockState },
      );

      const wasHandled = await result.current.sendNonEvmAsset(
        InitSendLocation.HomePage,
      );

      expect(wasHandled).toBe(true);
      expect(mockedHandleSendPageNavigation).toHaveBeenCalledWith(
        mockNavigate,
        {
          location: InitSendLocation.HomePage,
          asset: mockAsset,
        },
      );
    });
  });
});
