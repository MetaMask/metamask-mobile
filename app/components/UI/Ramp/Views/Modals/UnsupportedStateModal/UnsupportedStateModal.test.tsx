import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import UnsupportedStateModal from './UnsupportedStateModal';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { createStateSelectorModalNavigationDetails } from '../StateSelectorModal/StateSelectorModal';
import Routes from '../../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockOnStateSelect = jest.fn();

let mockUserRegion: unknown = {
  country: {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    currency: 'USD',
  },
  state: { stateId: 'NY', name: 'New York' },
  regionCode: 'us-ny',
};

jest.mock('../../../hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => ({ userRegion: mockUserRegion }),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
      isFocused: jest.fn(() => true),
    }),
  };
});

let mockParams: {
  stateCode?: string;
  stateName?: string;
  onStateSelect: typeof mockOnStateSelect;
} = {
  stateCode: 'NY',
  stateName: 'New York',
  onStateSelect: mockOnStateSelect,
};

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockParams),
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    { name: Routes.RAMP.MODALS.UNSUPPORTED_STATE },
    { state: { engine: { backgroundState } } },
  );
}

describe('UnsupportedStateModal (V2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRegion = {
      country: {
        isoCode: 'US',
        flag: '🇺🇸',
        name: 'United States',
        currency: 'USD',
      },
      state: { stateId: 'NY', name: 'New York' },
      regionCode: 'us-ny',
    };
    mockParams = {
      stateCode: 'NY',
      stateName: 'New York',
      onStateSelect: mockOnStateSelect,
    };
  });

  it('renders title, state name and action buttons', () => {
    const { getByText } = render(UnsupportedStateModal);
    expect(getByText('Region not supported')).toBeOnTheScreen();
    expect(getByText('New York')).toBeOnTheScreen();
    expect(getByText('Try another option')).toBeOnTheScreen();
    expect(getByText('Change region')).toBeOnTheScreen();
  });

  it('navigates to state selector on change region press', () => {
    const { getByText } = render(UnsupportedStateModal);
    fireEvent.press(getByText('Change region'));
    expect(mockNavigate).toHaveBeenCalledWith(
      ...createStateSelectorModalNavigationDetails({
        selectedState: 'NY',
        onStateSelect: mockOnStateSelect,
      }),
    );
  });

  it('navigates to wallet home on try another option press', () => {
    const { getByText } = render(UnsupportedStateModal);
    fireEvent.press(getByText('Try another option'));
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.HOME, {
      screen: Routes.WALLET.TAB_STACK_FLOW,
      params: { screen: Routes.WALLET_VIEW },
    });
  });

  it('falls back to country name when stateName param is missing', () => {
    mockParams = {
      stateCode: undefined,
      stateName: undefined,
      onStateSelect: mockOnStateSelect,
    };
    const { getByText, queryByText } = render(UnsupportedStateModal);
    expect(getByText('United States')).toBeOnTheScreen();
    expect(queryByText('New York')).not.toBeOnTheScreen();
  });

  it('renders country flag from userRegion', () => {
    const { getByText } = render(UnsupportedStateModal);
    expect(getByText('🇺🇸')).toBeOnTheScreen();
  });
});
