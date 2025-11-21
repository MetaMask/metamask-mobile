import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import BalanceEmptyState from './BalanceEmptyState';
import { BalanceEmptyStateProps } from './BalanceEmptyState.types';
import { RampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';
import { useMetrics } from '../../hooks/useMetrics';

// Mock useRampNavigation hook
const mockGoToBuy = jest.fn();
jest.mock('../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: jest.fn(() => ({ goToBuy: mockGoToBuy })),
}));

const mockButtonClickData: RampsButtonClickData = {
  ramp_routing: undefined,
  is_authenticated: false,
  preferred_provider: undefined,
  order_count: 0,
};

jest.mock('../Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: jest.fn(() => mockButtonClickData),
}));

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockEventBuilder = {
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({ event: 'built' }),
};

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: jest.fn(),
  MetaMetricsEvents: {
    BUY_BUTTON_CLICKED: 'buy_button_clicked',
    RAMPS_BUTTON_CLICKED: 'ramps_button_clicked',
  },
}));

jest.mock('../../../util/networks', () => ({
  getDecimalChainId: jest.fn(() => 1),
}));

describe('BalanceEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
    (useMetrics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
  });

  const renderComponent = (props: Partial<BalanceEmptyStateProps> = {}) =>
    renderWithProvider(
      <BalanceEmptyState testID="balance-empty-state" {...props} />,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId('balance-empty-state')).toBeDefined();
  });

  it('passes a twClassName to the Box component', () => {
    const { getByTestId } = renderComponent({ twClassName: 'mt-4' });
    expect(getByTestId('balance-empty-state')).toHaveStyle({
      marginTop: 16, // mt-4
    });
  });

  it('navigates to buy flow when action button is pressed', () => {
    const { getByTestId } = renderComponent();
    const actionButton = getByTestId('balance-empty-state-action-button');

    expect(actionButton).toBeDefined();

    fireEvent.press(actionButton);

    expect(mockGoToBuy).toHaveBeenCalled();
  });

  it('tracks RAMPS_BUTTON_CLICKED event when action button is pressed', () => {
    const { getByTestId } = renderComponent();
    const actionButton = getByTestId('balance-empty-state-action-button');

    fireEvent.press(actionButton);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith('ramps_button_clicked');
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Add funds',
        location: 'BalanceEmptyState',
        chain_id_destination: 1,
        ramp_type: 'BUY',
        ramp_routing: undefined,
        is_authenticated: false,
        preferred_provider: undefined,
        order_count: 0,
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });
});
