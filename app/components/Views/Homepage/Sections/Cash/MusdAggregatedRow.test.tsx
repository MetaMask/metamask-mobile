import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import MusdAggregatedRow from './MusdAggregatedRow';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import NavigationService from '../../../../../core/NavigationService';

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: jest.fn().mockReturnThis(),
  build: jest.fn().mockReturnValue({}),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../core/NavigationService', () => ({
  __esModule: true,
  default: {
    navigation: {
      navigate: jest.fn(),
    },
  },
}));

jest.mock('../../../../UI/Earn/hooks/useMusdBalance', () => ({
  useMusdBalance: () => ({
    tokenBalanceAggregated: '1000.50',
    fiatBalanceAggregatedFormatted: '$1,000.50',
  }),
}));

const mockClaimRewards = jest.fn();
jest.mock(
  '../../../../UI/Earn/components/MerklRewards/hooks/useMerklBonusClaim',
  () => ({
    useMerklBonusClaim: () => ({
      claimableReward: '5.00',
      hasPendingClaim: false,
      claimRewards: mockClaimRewards,
      isClaiming: false,
    }),
  }),
);

jest.mock('../../../../Views/confirmations/hooks/useNetworkName', () => ({
  useNetworkName: () => 'Linea Mainnet',
}));

const mockStore = configureMockStore();

const initialState = {
  engine: {
    backgroundState,
  },
  settings: {
    privacyMode: false,
  },
};

const renderComponent = (customState = {}) => {
  const store = mockStore({
    ...initialState,
    ...customState,
  });

  return render(
    <Provider store={store}>
      <MusdAggregatedRow />
    </Provider>,
  );
};

describe('MusdAggregatedRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = renderComponent();
    expect(getByTestId('cash-section-musd-row')).toBeTruthy();
  });

  it('displays mUSD token name', () => {
    const { getByText } = renderComponent();
    expect(getByText('MetaMask USD')).toBeTruthy();
  });

  it('displays fiat balance', () => {
    const { getByText } = renderComponent();
    expect(getByText('$1,000.50')).toBeTruthy();
  });

  it('displays token balance', () => {
    const { getByText } = renderComponent();
    expect(getByText('1,000.5 mUSD')).toBeTruthy();
  });

  it('navigates to asset details on row press', () => {
    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId('cash-section-musd-row'));

    expect(NavigationService.navigation.navigate).toHaveBeenCalledWith(
      'Asset',
      expect.objectContaining({
        source: expect.any(String),
      }),
    );
  });

  describe('claim bonus functionality', () => {
    it('displays claim bonus button when claimable reward is above threshold', () => {
      const { getByText } = renderComponent();
      expect(getByText('Claim bonus')).toBeTruthy();
    });

    it('triggers claim when claim bonus button is pressed', () => {
      const { getByText } = renderComponent();

      fireEvent.press(getByText('Claim bonus'));

      expect(mockClaimRewards).toHaveBeenCalled();
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });

  it('renders avatar token component', () => {
    const { getByTestId } = renderComponent();
    const row = getByTestId('cash-section-musd-row');
    expect(row).toBeTruthy();
  });
});
