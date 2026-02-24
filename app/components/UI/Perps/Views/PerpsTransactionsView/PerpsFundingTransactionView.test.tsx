import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import PerpsFundingTransactionView from './PerpsFundingTransactionView';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { PerpsTransactionSelectorsIDs } from '../../Perps.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();

const mockTransaction = {
  id: '1',
  title: 'Funding Payment',
  timestamp: 1706745600000,
  fundingAmount: {
    feeNumber: 5.25,
    isPositive: true,
    rate: '0.0125%',
  },
};

let mockRouteParams: { transaction?: typeof mockTransaction } = {
  transaction: mockTransaction,
};

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    navigate: mockNavigate,
    setOptions: mockSetOptions,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../hooks', () => ({
  usePerpsBlockExplorerUrl: () => ({
    getExplorerUrl: jest.fn().mockReturnValue('https://example.com/explorer'),
  }),
}));

const mockSelectedAccount = {
  id: 'account-1',
  address: '0x1234567890123456789012345678901234567890',
  type: 'eip155:eoa',
  metadata: {
    name: 'Account 1',
    keyring: { type: 'HD Key Tree' },
  },
  scopes: ['eip155:1'],
};

describe('PerpsFundingTransactionView', () => {
  const initialState = {
    engine: {
      backgroundState: {
        ...backgroundState,
        AccountsController: {
          internalAccounts: {
            selectedAccount: 'account-1',
            accounts: {
              'account-1': mockSelectedAccount,
            },
          },
        },
        AccountTreeController: {
          accountTree: {
            selectedAccountGroup: 'wallet-1/group-1',
            wallets: {
              'wallet-1': {
                groups: {
                  'wallet-1/group-1': {
                    accounts: ['account-1'],
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { transaction: mockTransaction };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders transaction title in header', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PerpsFundingTransactionView />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Funding Payment')).toBeOnTheScreen();
  });

  it('renders date row with formatted date', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PerpsFundingTransactionView />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Date')).toBeOnTheScreen();
  });

  it('renders fee row with amount', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PerpsFundingTransactionView />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Fee')).toBeOnTheScreen();
  });

  it('renders rate row', () => {
    // Arrange & Act
    const { getByText } = renderWithProvider(<PerpsFundingTransactionView />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Rate')).toBeOnTheScreen();
    expect(getByText('0.0125%')).toBeOnTheScreen();
  });

  it('renders scroll view with testID', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <PerpsFundingTransactionView />,
      {
        state: initialState,
      },
    );

    // Assert
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.FUNDING_TRANSACTION_VIEW),
    ).toBeOnTheScreen();
  });

  it('renders view on explorer button', () => {
    // Arrange & Act
    const { getByTestId } = renderWithProvider(
      <PerpsFundingTransactionView />,
      {
        state: initialState,
      },
    );

    // Assert
    expect(
      getByTestId(PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates to webview when explorer button is pressed', () => {
    // Arrange
    const { getByTestId } = renderWithProvider(
      <PerpsFundingTransactionView />,
      {
        state: initialState,
      },
    );
    const explorerButton = getByTestId(
      PerpsTransactionSelectorsIDs.BLOCK_EXPLORER_BUTTON,
    );

    // Act
    fireEvent.press(explorerButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://example.com/explorer',
      },
    });
  });

  it('navigates back when back button is pressed', () => {
    // Arrange
    const { getByTestId } = renderWithProvider(
      <PerpsFundingTransactionView />,
      {
        state: initialState,
      },
    );
    const backButton = getByTestId('button-icon');

    // Act
    fireEvent.press(backButton);

    // Assert
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('PerpsFundingTransactionView with missing transaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  it('renders not found message when transaction is missing', () => {
    // Arrange
    const initialState = {
      engine: {
        backgroundState: {
          ...backgroundState,
        },
      },
    };

    // Act
    const { getByText } = renderWithProvider(<PerpsFundingTransactionView />, {
      state: initialState,
    });

    // Assert
    expect(getByText('Transaction not found')).toBeOnTheScreen();
  });
});
