import React from 'react';
import { render } from '@testing-library/react-native';
import { WalletDetails } from './WalletDetails';
import { selectWalletById } from '../../../../selectors/multichainAccounts/accountTreeController';
import { AccountWalletObject } from '@metamask/account-tree-controller';

let mockRouteParams: { walletId: string };

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn((selector) => selector()),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectWalletById: jest.fn(),
  }),
);

const mockBaseWalletDetails = jest.fn(
  (_props?: Record<string, unknown>) => null,
);
jest.mock('./BaseWalletDetails', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    BaseWalletDetails: (props: Record<string, unknown>) => {
      mockBaseWalletDetails(props);
      return (
        <View testID="base-wallet-details">
          <Text>{`BaseWalletDetails:${(props.wallet as AccountWalletObject).metadata.name}`}</Text>
        </View>
      );
    },
  };
});

const mockSelectWalletById = selectWalletById as jest.MockedFunction<
  typeof selectWalletById
>;

const createWallet = (id: string, name: string): AccountWalletObject =>
  ({
    id,
    metadata: { name },
    groups: {},
  }) as unknown as AccountWalletObject;

describe('WalletDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { walletId: 'wallet-1' };
  });

  it('renders BaseWalletDetails when wallet is found', () => {
    const wallet = createWallet('wallet-1', 'My Wallet');
    mockSelectWalletById.mockReturnValue(((wId: string) =>
      wId === 'wallet-1' ? wallet : null) as ReturnType<
      typeof selectWalletById
    >);

    const { getByText } = render(<WalletDetails />);

    expect(getByText('BaseWalletDetails:My Wallet')).toBeTruthy();
    expect(mockBaseWalletDetails).toHaveBeenCalledWith(
      expect.objectContaining({ wallet }),
    );
  });

  it('returns null when wallet is not found', () => {
    mockSelectWalletById.mockReturnValue(
      (() => null) as ReturnType<typeof selectWalletById>,
    );

    const { toJSON } = render(<WalletDetails />);

    expect(toJSON()).toBeNull();
    expect(mockBaseWalletDetails).not.toHaveBeenCalled();
  });

  it('passes the correct walletId from route params to the selector', () => {
    mockRouteParams = { walletId: 'wallet-42' };
    const wallet = createWallet('wallet-42', 'Wallet 42');
    const lookupFn = jest.fn((wId: string) =>
      wId === 'wallet-42' ? wallet : null,
    );
    mockSelectWalletById.mockReturnValue(
      lookupFn as unknown as ReturnType<typeof selectWalletById>,
    );

    render(<WalletDetails />);

    expect(lookupFn).toHaveBeenCalledWith('wallet-42');
  });

  it('returns null when selectWallet returns undefined', () => {
    mockSelectWalletById.mockReturnValue(
      (() => undefined) as unknown as ReturnType<typeof selectWalletById>,
    );

    const { toJSON } = render(<WalletDetails />);

    expect(toJSON()).toBeNull();
    expect(mockBaseWalletDetails).not.toHaveBeenCalled();
  });
});
