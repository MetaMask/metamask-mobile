import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import BalanceEmptyState from './BalanceEmptyState';
import { MetaMetricsEvents } from '../../../core/Analytics/MetaMetrics.events';
import { TraceName } from '../../../util/trace';

// Mock navigation
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock metrics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    CARD_ADD_FUNDS_DEPOSIT_CLICKED: 'CARD_ADD_FUNDS_DEPOSIT_CLICKED',
    RAMPS_BUTTON_CLICKED: 'RAMPS_BUTTON_CLICKED',
  },
}));

// Mock trace
const mockTrace = jest.fn();
jest.mock('../../../../util/trace', () => ({
  trace: mockTrace,
  TraceName: {
    LoadDepositExperience: 'LoadDepositExperience',
  },
}));

// Mock createDepositNavigationDetails
const mockCreateDepositNavigationDetails = jest.fn(() => ['DepositScreen', {}]);
jest.mock('../../Ramp/Deposit/routes/utils', () => ({
  createDepositNavigationDetails: mockCreateDepositNavigationDetails,
}));

// Mock getDecimalChainId
jest.mock('../../../../util/networks', () => ({
  getDecimalChainId: jest.fn(() => 1),
}));

// Mock strings
jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const strings: { [key: string]: string } = {
      'wallet.fund_your_wallet': 'Fund your wallet',
      'wallet.get_ready_for_web3': 'Get your wallet ready to use web3',
      'wallet.add_funds': 'Add funds',
    };
    return strings[key] || key;
  }),
}));

describe('BalanceEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockState = {
    engine: {
      backgroundState: {
        NetworkController: {
          selectedNetworkClientId: 'mainnet',
          networkConfigurations: {},
        },
      },
    },
  };

  it('renders correctly with localized content', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <BalanceEmptyState testID="balance-empty-state" />,
      { state: mockState },
    );

    expect(getByTestId('balance-empty-state')).toBeDefined();
    expect(getByText('Fund your wallet')).toBeDefined();
    expect(getByText('Get your wallet ready to use web3')).toBeDefined();
    expect(getByText('Add funds')).toBeDefined();
  });

  it('navigates to deposit screen when button is pressed', () => {
    const { getByTestId } = renderWithProvider(<BalanceEmptyState />, {
      state: mockState,
    });

    const actionButton = getByTestId('balance-empty-state-action-button');
    fireEvent.press(actionButton);

    expect(mockCreateDepositNavigationDetails).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('DepositScreen', {});
  });

  it('tracks metrics when button is pressed', () => {
    const { getByTestId } = renderWithProvider(<BalanceEmptyState />, {
      state: mockState,
    });

    const actionButton = getByTestId('balance-empty-state-action-button');
    fireEvent.press(actionButton);

    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.CARD_ADD_FUNDS_DEPOSIT_CLICKED,
    );
    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
    );
  });

  it('traces deposit experience when button is pressed', () => {
    const { getByTestId } = renderWithProvider(<BalanceEmptyState />, {
      state: mockState,
    });

    const actionButton = getByTestId('balance-empty-state-action-button');
    fireEvent.press(actionButton);

    expect(mockTrace).toHaveBeenCalledWith({
      name: TraceName.LoadDepositExperience,
    });
  });

  it('calls custom onAction when provided', () => {
    const mockOnAction = jest.fn();
    const { getByTestId } = renderWithProvider(
      <BalanceEmptyState onAction={mockOnAction} />,
      { state: mockState },
    );

    const actionButton = getByTestId('balance-empty-state-action-button');
    fireEvent.press(actionButton);

    expect(mockOnAction).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('has proper test IDs for all elements', () => {
    const { getByTestId } = renderWithProvider(
      <BalanceEmptyState testID="test-component" />,
      { state: mockState },
    );

    expect(getByTestId('test-component')).toBeTruthy();
    expect(getByTestId('test-component-image')).toBeTruthy();
    expect(getByTestId('test-component-title')).toBeTruthy();
    expect(getByTestId('test-component-subtitle')).toBeTruthy();
    expect(getByTestId('test-component-action-button')).toBeTruthy();
  });

  it('displays the bank transfer image', () => {
    const { getByTestId } = renderWithProvider(<BalanceEmptyState />, {
      state: mockState,
    });

    const image = getByTestId('balance-empty-state-image');
    expect(image).toBeTruthy();
    expect(image.props.source).toBeDefined();
  });

  it('matches snapshot', () => {
    const component = renderWithProvider(<BalanceEmptyState />, {
      state: mockState,
    });
    expect(component).toMatchSnapshot();
  });
});
