import React from 'react';
import { Country } from '@consensys/on-ramp-sdk';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';

import Regions from './Regions';
import useRegions from '../../hooks/useRegions';
import { RampSDK } from '../../sdk';
import { RampType, Region } from '../../types';
import { createBuildQuoteNavDetails } from '../BuildQuote/BuildQuote';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.RAMP.REGION,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

const mockSetSelectedRegion = jest.fn();
const mockSetSelectedCurrency = jest.fn();

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  setSelectedRegion: mockSetSelectedRegion,
  setSelectedFiatCurrencyId: mockSetSelectedCurrency,
  sdkError: undefined,
  rampType: RampType.BUY,
  isBuy: true,
  isSell: false,
};

let mockUseRampSDKValues: Partial<RampSDK> = {
  ...mockUseRampSDKInitialValues,
};

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useRampSDK: () => mockUseRampSDKValues,
}));

const mockQueryGetCountries = jest.fn();
const mockClearUnsupportedRegion = jest.fn();

const mockRegionsData = [
  {
    currencies: ['/currencies/fiat/clp'],
    emoji: '🇨🇱',
    id: '/regions/cl',
    name: 'Chile',
    unsupported: false,
    support: {
      buy: true,
      sell: true,
    },
  },
  {
    currencies: ['/currencies/fiat/ars'],
    emoji: '🇦🇷',
    id: '/regions/ar',
    name: 'Argentina',
    unsupported: false,
    support: {
      buy: true,
      sell: true,
    },
  },
] as Partial<Country>[];

const mockUseRegionsInitialValues: Partial<ReturnType<typeof useRegions>> = {
  data: mockRegionsData as Country[],
  isFetching: false,
  error: null,
  query: mockQueryGetCountries,
  selectedRegion: null,
  unsupportedRegion: undefined,
  clearUnsupportedRegion: mockClearUnsupportedRegion,
};

let mockUseRegionsValues: Partial<ReturnType<typeof useRegions>> = {
  ...mockUseRegionsInitialValues,
};

jest.mock('../../hooks/useRegions', () => jest.fn(() => mockUseRegionsValues));

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockPop = jest.fn();
const mockTrackEvent = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      reset: mockReset,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      dangerouslyGetParent: () => ({
        pop: mockPop,
      }),
    }),
  };
});

jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

describe('Regions View', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetOptions.mockClear();
    mockPop.mockClear();
    mockTrackEvent.mockClear();
    mockReset.mockClear();
    (mockUseRampSDKInitialValues.setSelectedRegion as jest.Mock).mockClear();
    (
      mockUseRampSDKInitialValues.setSelectedFiatCurrencyId as jest.Mock
    ).mockClear();
  });

  beforeEach(() => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
    };
  });

  it('calls setOptions when rendering', async () => {
    render(Regions);
    expect(mockSetOptions).toHaveBeenCalledTimes(1);
  });

  it('renders correctly', async () => {
    render(Regions);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly while loading', async () => {
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      isFetching: true,
    };
    render(Regions);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with no data', async () => {
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      data: null,
    };
    render(Regions);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with selectedRegion', async () => {
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      selectedRegion: mockRegionsData[0] as Country,
    };
    render(Regions);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('resets the navigation with selectedRegion', async () => {
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      selectedRegion: mockRegionsData[0] as Country,
    };
    render(Regions);
    expect(mockReset).toHaveBeenCalled();
  });

  it('does not reset the navigation with selectedRegion unsupported', async () => {
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      selectedRegion: { ...mockRegionsData[0], unsupported: true } as Country,
    };
    render(Regions);
    expect(mockReset).not.toHaveBeenCalled();

    mockReset.mockClear();

    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      isBuy: true,
      isSell: false,
    };
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      selectedRegion: {
        ...mockRegionsData[0],
        unsupported: false,
        support: { buy: false, sell: true },
      } as Country,
    };
    render(Regions);
    expect(mockReset).not.toHaveBeenCalled();

    mockReset.mockClear();

    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      isBuy: false,
      isSell: true,
    };
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      selectedRegion: {
        ...mockRegionsData[0],
        unsupported: false,
        support: { buy: true, sell: false },
      } as Country,
    };
    render(Regions);
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('renders regions modal when pressing select button', async () => {
    render(Regions);
    const selectRegionButton = screen.getByRole('button', {
      name: 'Select your region',
    });
    fireEvent.press(selectRegionButton);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setSelectedRegion when pressing a region', async () => {
    render(Regions);
    const regionToPress = mockRegionsData[0] as Region;
    // First show region modal
    const selectRegionButton = screen.getByRole('button', {
      name: 'Select your region',
    });
    fireEvent.press(selectRegionButton);
    // Then detect region selection buttons
    const regionButton = screen.getByRole('button', {
      name: regionToPress.name,
    });
    fireEvent.press(regionButton);
    expect(mockSetSelectedRegion).toHaveBeenCalledWith(regionToPress);
    expect(mockTrackEvent).toBeCalledWith('RAMP_REGION_SELECTED', {
      country_id: '/regions/cl',
      is_unsupported_onramp: false,
      is_unsupported_offramp: false,
      location: 'Region Screen',
      state_id: '/regions/cl',
    });
  });

  it('navigates on continue press', async () => {
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      selectedRegion: mockRegionsData[0] as Country,
    };
    render(Regions);
    fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockNavigate).toHaveBeenCalledWith(...createBuildQuoteNavDetails());
  });

  it('navigates and tracks event on cancel button press', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
    render(Regions);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockPop).toHaveBeenCalled();
    expect(mockTrackEvent).toBeCalledWith('ONRAMP_CANCELED', {
      chain_id_destination: '1',
      location: 'Region Screen',
    });

    mockTrackEvent.mockReset();
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      isBuy: false,
      isSell: true,
    };
    render(Regions);
    fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockTrackEvent).toHaveBeenCalledWith('OFFRAMP_CANCELED', {
      chain_id_source: '1',
      location: 'Region Screen',
    });
  });

  it('has continue button disabled', async () => {
    render(Regions);
    const continueButton = screen.getByRole('button', { name: 'Continue' });
    expect(continueButton.props.disabled).toBe(true);
  });

  it('renders correctly with unsupportedRegion', async () => {
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      unsupportedRegion: mockRegionsData[1] as Region,
    };
    render(Regions);
    expect(screen.toJSON()).toMatchSnapshot();

    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      isBuy: false,
      isSell: true,
      rampType: RampType.SELL,
    };
    render(Regions);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with sdkError', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    render(Regions);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to home when clicking sdKError button', async () => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    render(Regions);
    fireEvent.press(
      screen.getByRole('button', { name: 'Return to Home Screen' }),
    );
    expect(mockPop).toHaveBeenCalledTimes(1);
  });

  it('renders correctly with error', async () => {
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      error: 'Test error',
    };
    render(Regions);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('queries countries again with error', async () => {
    mockUseRegionsValues = {
      ...mockUseRegionsInitialValues,
      error: 'Test error',
    };
    render(Regions);
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(mockQueryGetCountries).toHaveBeenCalledTimes(1);
  });
});
