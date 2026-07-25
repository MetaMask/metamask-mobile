import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import BalanceEmptyState from './BalanceEmptyState';
import { BalanceEmptyStateProps } from './BalanceEmptyState.types';
import { RampsButtonClickData } from '../Ramp/hooks/useRampsButtonClickData';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { createMockUseAnalyticsHook } from '../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../core/Analytics';
import Routes from '../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

const mockButtonClickData: RampsButtonClickData = {
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

jest.mock('../../hooks/useAnalytics/useAnalytics');

jest.mock('../../../util/networks', () => ({
  getDecimalChainId: jest.fn(() => 1),
}));

describe('BalanceEmptyState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEventBuilder.mockReturnValue(mockEventBuilder);
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
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

  it('opens the fund action menu when action button is pressed', () => {
    const { getByTestId } = renderComponent();
    const actionButton = getByTestId('balance-empty-state-action-button');

    expect(actionButton).toBeDefined();

    fireEvent.press(actionButton);

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.FUND_ACTION_MENU,
    });
  });

  it('tracks RAMPS_BUTTON_CLICKED event when opening the fund menu', () => {
    const { getByTestId } = renderComponent();
    const actionButton = getByTestId('balance-empty-state-action-button');

    fireEvent.press(actionButton);

    expect(mockCreateEventBuilder).toHaveBeenCalledWith(
      MetaMetricsEvents.RAMPS_BUTTON_CLICKED,
    );
    expect(mockEventBuilder.addProperties).toHaveBeenCalledWith(
      expect.objectContaining({
        button_text: 'Add funds',
        location: 'BalanceEmptyState',
        chain_id_destination: 1,
        ramp_type: 'FUND_MENU',
        is_authenticated: false,
        preferred_provider: undefined,
        order_count: 0,
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });
});
