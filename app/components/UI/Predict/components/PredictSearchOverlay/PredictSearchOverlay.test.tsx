import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { selectPredictBrandRefreshEnabled } from '../../../../../selectors/featureFlagController/predictBrandRefresh';
import { PredictSearchSelectorsIDs } from '../../Predict.testIds';
import PredictSearchOverlay from './PredictSearchOverlay';

jest.mock(
  '../../../../../selectors/featureFlagController/predictBrandRefresh',
  () => ({ selectPredictBrandRefreshEnabled: jest.fn() }),
);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    PredictController: { trackSearchInteracted: jest.fn() },
  },
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectPredictUpDownEnabledFlag: jest.fn(() => false),
}));

jest.mock('../../hooks/usePredictSearchMarketData', () => ({
  usePredictSearchMarketData: jest.fn(() => ({
    marketData: [],
    totalResults: 0,
    isFetching: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

jest.mock(
  '../../../../../component-library/components-temp/CapsuleGlass',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ children }: { children: React.ReactNode }) => (
        <View testID="capsule">{children}</View>
      ),
    };
  },
);

const mockSelectPredictBrandRefreshEnabled = jest.mocked(
  selectPredictBrandRefreshEnabled,
);

const renderOverlay = (onClose = jest.fn()) =>
  renderWithProvider(
    <PredictSearchOverlay
      isVisible
      searchQuery="btc"
      onSearchChange={jest.fn()}
      onClose={onClose}
    />,
    { state: { engine: { backgroundState } } },
  );

describe('PredictSearchOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the current search header when the brand refresh is off', () => {
    mockSelectPredictBrandRefreshEnabled.mockReturnValue(false);

    renderOverlay();

    expect(
      screen.getByTestId(PredictSearchSelectorsIDs.CLEAR_BUTTON),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('capsule')).toBeNull();
  });

  it('renders the glass search header when the brand refresh is on', () => {
    mockSelectPredictBrandRefreshEnabled.mockReturnValue(true);

    renderOverlay();

    expect(screen.getAllByTestId('capsule')).toHaveLength(2);
    expect(
      screen.getByTestId(PredictSearchSelectorsIDs.CLEAR_BUTTON),
    ).toBeOnTheScreen();
  });

  it('closes when Cancel is pressed on the glass header', () => {
    mockSelectPredictBrandRefreshEnabled.mockReturnValue(true);
    const onClose = jest.fn();

    renderOverlay(onClose);
    fireEvent.press(screen.getByText('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
