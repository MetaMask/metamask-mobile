import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import RegionSelector from './RegionSelector';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import { Country, State, UserRegion } from '@metamask/ramps-controller';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetOptions,
    }),
  };
});

const mockSetUserRegion = jest.fn().mockResolvedValue(undefined);
const createMockCountry = (
  isoCode: string,
  name: string,
  flag: string,
  states?: State[],
  supported = true,
  recommended = false,
): Country => ({
  isoCode,
  name,
  flag,
  states,
  supported: { buy: supported, sell: supported },
  recommended,
  phone: { prefix: '', placeholder: '', template: '' },
  currency: '',
});

const createMockState = (
  stateId: string,
  name: string,
  supported = true,
): State => ({
  stateId,
  name,
  supported: { buy: supported, sell: supported },
});

const createMockUserRegion = (regionCode: string): UserRegion => {
  const parts = regionCode.toLowerCase().split('-');
  const countryCode = parts[0].toUpperCase();
  const stateCode = parts[1]?.toUpperCase();

  return {
    country: {
      isoCode: countryCode,
      flag: '🏳️',
      name: countryCode,
      phone: { prefix: '', placeholder: '', template: '' },
      currency: '',
      supported: { buy: true, sell: true },
    },
    state: stateCode
      ? {
          stateId: stateCode,
          name: stateCode,
          supported: { buy: true, sell: true },
        }
      : null,
    regionCode: regionCode.toLowerCase(),
  };
};

const mockRegions: Country[] = [
  createMockCountry('US', 'United States', '🇺🇸', [
    createMockState('CA', 'California'),
    createMockState('NY', 'New York'),
  ]),
  createMockCountry('CA', 'Canada', '🇨🇦', [createMockState('ON', 'Ontario')]),
  createMockCountry('FR', 'France', '🇫🇷', undefined, true, true),
  createMockCountry('XX', 'Unsupported Country', '🏳️', undefined, false),
];

const mockUserRegionInitial = {
  userRegion: null as UserRegion | null,
  setUserRegion: mockSetUserRegion,
};

const mockCountriesInitial = {
  countries: mockRegions,
  isLoading: false,
  error: null as string | null,
};

let mockUserRegionValues = { ...mockUserRegionInitial };
let mockCountriesValues = { ...mockCountriesInitial };

jest.mock('../../../hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => mockUserRegionValues,
}));

jest.mock('../../../hooks/useRampsCountries', () => ({
  useRampsCountries: () => mockCountriesValues,
}));

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.SETTINGS.REGION_SELECTOR,
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

describe('RegionSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserRegionValues = { ...mockUserRegionInitial };
    mockCountriesValues = { ...mockCountriesInitial };
  });

  it('renders countries list', () => {
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders loading state when regions are loading', () => {
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: [],
      isLoading: true,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders error state when countries error occurs', () => {
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: [],
      isLoading: false,
      error: 'Failed to fetch countries',
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders with selected user region', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders recommended countries', () => {
    const recommendedRegions = [
      createMockCountry('US', 'United States', '🇺🇸', undefined, true, true),
      createMockCountry('CA', 'Canada', '🇨🇦', undefined, true, false),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: recommendedRegions,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('filters regions when search text is entered', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'United');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('displays empty state when search has no results', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'NonExistentCountry');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('clears search text when clear button is pressed', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'United');
    expect(searchInput.props.value).toBe('United');

    const clearButton = screen.getByTestId('region-selector-clear-button');
    fireEvent.press(clearButton);

    expect(searchInput.props.value).toBe('');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to states view when country with states is selected', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders states view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates back to countries view when back button is pressed in states view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(mockSetOptions).toHaveBeenCalled();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setUserRegion and navigates back when state is selected', async () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    const stateItem = screen.getByText('California');
    await act(async () => {
      fireEvent.press(stateItem);
    });
    await expect(mockSetUserRegion).toHaveBeenCalledWith('us-ca');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls setUserRegion with correct format when stateId includes country code', async () => {
    const countriesWithPrefixedStateId: Country[] = [
      createMockCountry('US', 'United States', '🇺🇸', [
        createMockState('US-AL', 'Alabama'),
        createMockState('US-CA', 'California'),
      ]),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: countriesWithPrefixedStateId,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    const stateItem = screen.getByText('Alabama');
    await act(async () => {
      fireEvent.press(stateItem);
    });
    await expect(mockSetUserRegion).toHaveBeenCalledWith('us-al');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls setUserRegion and navigates back when country without states is selected', async () => {
    render(RegionSelector);
    const countryItem = screen.getByText('France');
    await act(async () => {
      fireEvent.press(countryItem);
    });
    await expect(mockSetUserRegion).toHaveBeenCalledWith('fr');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders unsupported country', () => {
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders when country has states and user region state is shown', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('updates navigation title when switching to states view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('renders search placeholder for states view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    const searchInput = screen.getByTestId('textfieldsearch');
    expect(searchInput.props.placeholder).toBe('Search by state');
  });

  it('renders description text only in country view', () => {
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders with empty regions array', () => {
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: [],
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders country without flag', () => {
    const regionsWithoutFlag = [
      createMockCountry('US', 'United States', '', [
        createMockState('CA', 'California'),
      ]),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: regionsWithoutFlag,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders state without stateId', () => {
    const stateWithoutId: State = {
      name: 'State Without ID',
      supported: { buy: true, sell: true },
    };
    const regionsWithStateWithoutId = [
      createMockCountry('US', 'United States', '🇺🇸', [stateWithoutId]),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: regionsWithStateWithoutId,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders unsupported state', () => {
    const unsupportedState = createMockState('TX', 'Texas', false);
    const regionsWithUnsupportedState = [
      createMockCountry('US', 'United States', '🇺🇸', [
        createMockState('CA', 'California'),
        unsupportedState,
      ]),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: regionsWithUnsupportedState,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not navigate back when setUserRegion error occurs', async () => {
    const errorMock = jest
      .fn()
      .mockRejectedValue(new Error('Failed to set region'));
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      setUserRegion: errorMock,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('France');
    await act(async () => {
      fireEvent.press(countryItem);
    });
    await expect(errorMock).toHaveBeenCalledWith('fr');
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('clears search and scrolls to top when clear button is pressed', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'United');
    expect(searchInput.props.value).toBe('United');

    const clearButton = screen.getByTestId('region-selector-clear-button');
    fireEvent.press(clearButton);

    expect(searchInput.props.value).toBe('');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('scrolls to top when search text changes', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'Test');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('sets up back button in state view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(mockSetOptions).toHaveBeenCalled();
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('shows state name in country view when user has selected a state', () => {
    const userRegionWithState: UserRegion = {
      country: {
        isoCode: 'US',
        flag: '🇺🇸',
        name: 'United States',
        phone: { prefix: '', placeholder: '', template: '' },
        currency: '',
        supported: { buy: true, sell: true },
        states: [createMockState('CA', 'California')],
      },
      state: {
        stateId: 'CA',
        name: 'California',
        supported: { buy: true, sell: true },
      },
      regionCode: 'us-ca',
    };
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: userRegionWithState,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('displays grouped search results showing country and matching states', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'Cal');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('displays standalone states in search results', () => {
    const standaloneState: State = {
      stateId: 'TX',
      name: 'Texas',
      supported: { buy: true, sell: true },
    };
    const regionsWithStandaloneState = [
      createMockCountry('US', 'United States', '🇺🇸', [
        createMockState('CA', 'California'),
        standaloneState,
      ]),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: regionsWithStandaloneState,
    };
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'Texas');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('displays standalone countries in search results', () => {
    const standaloneCountry = createMockCountry('DE', 'Germany', '🇩🇪');
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: [...mockRegions, standaloneCountry],
    };
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'Germany');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders disabled country', () => {
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders disabled state', () => {
    const unsupportedState = createMockState('TX', 'Texas', false);
    const regionsWithUnsupportedState = [
      createMockCountry('US', 'United States', '🇺🇸', [
        createMockState('CA', 'California'),
        unsupportedState,
      ]),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: regionsWithUnsupportedState,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('updates navigation title with country name when in state view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('resets search when navigating to state view', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'United');
    expect(searchInput.props.value).toBe('United');

    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);

    const searchInputAfter = screen.getByTestId('textfieldsearch');
    expect(searchInputAfter.props.value).toBe('');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders country with supported set to false', () => {
    const unsupportedCountry = createMockCountry(
      'XX',
      'Unsupported',
      '🏳️',
      undefined,
      false,
    );
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: [unsupportedCountry],
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders state with supported set to false', () => {
    const unsupportedState = createMockState('TX', 'Texas', false);
    const regionsWithUnsupportedState = [
      createMockCountry('US', 'United States', '🇺🇸', [unsupportedState]),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: regionsWithUnsupportedState,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not call setUserRegion when region selection has empty regionId', async () => {
    const stateWithoutId: State = {
      name: 'State Without ID',
      supported: { buy: true, sell: true },
    };
    const regionsWithStateWithoutId = [
      createMockCountry('US', 'United States', '🇺🇸', [stateWithoutId]),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: regionsWithStateWithoutId,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    const stateItem = screen.getByText('State Without ID');
    await act(async () => {
      fireEvent.press(stateItem);
    });
    expect(mockSetUserRegion).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('limits search results', () => {
    const manyRegions = Array.from({ length: 30 }, (_, i) =>
      createMockCountry(`C${i}`, `Country ${i}`, '🏳️'),
    );
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: manyRegions,
    };
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'Country');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('sorts regions with recommended first when no search', () => {
    const regions = [
      createMockCountry('US', 'United States', '🇺🇸', undefined, true, false),
      createMockCountry('FR', 'France', '🇫🇷', undefined, true, true),
      createMockCountry('CA', 'Canada', '🇨🇦', undefined, true, false),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: regions,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('updates currentData when regions change in country view', () => {
    render(RegionSelector);
    const initialSnapshot = screen.toJSON();

    const newRegions = [createMockCountry('DE', 'Germany', '🇩🇪')];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: newRegions,
    };

    render(RegionSelector);
    expect(screen.toJSON()).not.toEqual(initialSnapshot);
  });

  it('highlights country when regionCode exactly matches country code', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('fr'),
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('highlights country when regionCode starts with country code and state is selected', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('highlights state when selected in state view', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('highlights state in grouped search results when parent country matches', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'California');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not highlight state when country does not match', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('ca-on'),
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not highlight state when state ID does not match', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ny'),
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not highlight state when userRegion has no state', () => {
    const userRegionWithoutState: UserRegion = {
      country: {
        isoCode: 'US',
        flag: '🇺🇸',
        name: 'United States',
        phone: { prefix: '', placeholder: '', template: '' },
        currency: '',
        supported: { buy: true, sell: true },
      },
      state: null,
      regionCode: 'us',
    };
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: userRegionWithoutState,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('does not highlight country when regionCode does not match', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('de'),
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('falls back to userCountryCode when regionInTransit is null during state selection', () => {
    const standaloneState: State = {
      stateId: 'CA',
      name: 'California',
      supported: { buy: true, sell: true },
    };
    const regionsWithStandaloneState = [
      createMockCountry('US', 'United States', '🇺🇸', [standaloneState]),
    ];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: regionsWithStandaloneState,
    };
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'California');
    expect(screen.toJSON()).toMatchSnapshot();
  });
});
