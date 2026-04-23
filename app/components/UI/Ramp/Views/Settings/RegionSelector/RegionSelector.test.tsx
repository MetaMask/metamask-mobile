import React from 'react';
import { fireEvent, screen, act } from '@testing-library/react-native';
import { strings } from '../../../../../../../locales/i18n';
import RegionSelector from './RegionSelector';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import Routes from '../../../../../../constants/navigation/Routes';
import { Country, State, UserRegion } from '@metamask/ramps-controller';
import { REGION_SELECTOR_TEST_IDS } from './RegionSelector.testIds';
import { CommonSelectorsIDs } from '../../../../../../util/Common.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
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
    expect(screen.getByText('United States')).toBeOnTheScreen();
    expect(screen.getByText('Canada')).toBeOnTheScreen();
    expect(screen.getByText('France')).toBeOnTheScreen();
  });

  it('renders loading state when regions are loading', () => {
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: [],
      isLoading: true,
    };
    render(RegionSelector);
    expect(screen.getByTestId('textfieldsearch')).toBeOnTheScreen();
    expect(screen.queryByText('United States')).not.toBeOnTheScreen();
  });

  it('renders error state when countries error occurs', () => {
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: [],
      isLoading: false,
      error: 'Failed to fetch countries',
    };
    render(RegionSelector);
    expect(screen.getByText('Error')).toBeOnTheScreen();
  });

  it('renders with selected user region', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    expect(screen.getByText('United States')).toBeOnTheScreen();
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
    expect(screen.getByText('United States')).toBeOnTheScreen();
    expect(screen.getByText('Canada')).toBeOnTheScreen();
  });

  it('filters regions when search text is entered', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'United');
    expect(screen.getByText('United States')).toBeOnTheScreen();
    expect(screen.queryByText('Canada')).not.toBeOnTheScreen();
  });

  it('displays empty state when search has no results', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'NonExistentCountry');
    expect(
      screen.getByText(
        strings('fiat_on_ramp_aggregator.region.no_region_results', {
          searchString: 'NonExistentCountry',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('clears search text when clear button is pressed', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'United');
    expect(searchInput.props.value).toBe('United');

    const clearButton = screen.getByTestId('region-selector-clear-button');
    fireEvent.press(clearButton);

    expect(searchInput.props.value).toBe('');
    expect(screen.getByText('United States')).toBeOnTheScreen();
  });

  it('calls navigation.goBack when header back is pressed on country list', () => {
    render(RegionSelector);

    fireEvent.press(screen.getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to states view when country with states is selected', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.getByText('California')).toBeOnTheScreen();
    expect(screen.getByText('New York')).toBeOnTheScreen();
  });

  it('renders states view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.getByText('California')).toBeOnTheScreen();
  });

  it('navigates back to countries view when back button is pressed in states view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(
      screen.getByTestId(REGION_SELECTOR_TEST_IDS.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(screen.getByText('California')).toBeOnTheScreen();
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

  it('renders unsupported country in the list', () => {
    render(RegionSelector);
    expect(screen.getByText('Unsupported Country')).toBeOnTheScreen();
  });

  it('renders countries list when user region state is selected', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    expect(screen.getByText('United States')).toBeOnTheScreen();
  });

  it('updates navigation title when switching to states view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(
      screen.getByTestId(REGION_SELECTOR_TEST_IDS.BACK_BUTTON),
    ).toBeOnTheScreen();
  });

  it('renders search placeholder for states view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    const searchInput = screen.getByTestId('textfieldsearch');
    expect(searchInput).toHaveProp('placeholder', 'Search by state');
  });

  it('renders description text only in country view', () => {
    render(RegionSelector);
    expect(
      screen.getByText(
        'Payment methods and available tokens may vary based on your region and our providers.',
      ),
    ).toBeOnTheScreen();
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(
      screen.queryByText(
        'Payment methods and available tokens may vary based on your region and our providers.',
      ),
    ).toBeNull();
  });

  it('renders with empty regions array', () => {
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: [],
    };
    render(RegionSelector);
    expect(screen.getByTestId('textfieldsearch')).toBeOnTheScreen();
    expect(screen.queryByText('United States')).not.toBeOnTheScreen();
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
    expect(screen.getByText('United States')).toBeOnTheScreen();
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
    expect(screen.getByText('United States')).toBeOnTheScreen();
  });

  it('renders unsupported state in states view', () => {
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
    expect(screen.getByText('California')).toBeOnTheScreen();
    expect(screen.getByText('Texas')).toBeOnTheScreen();
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
    expect(screen.getByText('United States')).toBeOnTheScreen();
  });

  it('shows search results when search text changes', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'France');
    expect(screen.getByText('France')).toBeOnTheScreen();
    expect(screen.queryByText('Canada')).not.toBeOnTheScreen();
  });

  it('sets up back button in state view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(
      screen.getByTestId(REGION_SELECTOR_TEST_IDS.BACK_BUTTON),
    ).toBeOnTheScreen();
    expect(screen.getByText('California')).toBeOnTheScreen();
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
    expect(screen.getByText('United States')).toBeOnTheScreen();
  });

  it('displays grouped search results showing country and matching states', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'Cal');
    expect(screen.getByText('California')).toBeOnTheScreen();
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
    expect(screen.getByText('Texas')).toBeOnTheScreen();
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
    expect(screen.getByText('Germany')).toBeOnTheScreen();
  });

  it('renders disabled country in the list', () => {
    render(RegionSelector);
    expect(screen.getByText('Unsupported Country')).toBeOnTheScreen();
  });

  it('renders disabled state in states view', () => {
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
    expect(screen.getByText('California')).toBeOnTheScreen();
    expect(screen.getByText('Texas')).toBeOnTheScreen();
  });

  it('updates navigation title with country name when in state view', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(
      screen.getByTestId(REGION_SELECTOR_TEST_IDS.BACK_BUTTON),
    ).toBeOnTheScreen();
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
    expect(screen.getByText('California')).toBeOnTheScreen();
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
    expect(screen.getByText('Unsupported')).toBeOnTheScreen();
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
    expect(screen.getByText('Texas')).toBeOnTheScreen();
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
    expect(screen.getByText('Country 0')).toBeOnTheScreen();
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
    expect(screen.getByText('France')).toBeOnTheScreen();
    expect(screen.getByText('United States')).toBeOnTheScreen();
    expect(screen.getByText('Canada')).toBeOnTheScreen();
  });

  it('updates currentData when regions change in country view', () => {
    render(RegionSelector);
    expect(screen.getByText('United States')).toBeOnTheScreen();

    const newRegions = [createMockCountry('DE', 'Germany', '🇩🇪')];
    mockCountriesValues = {
      ...mockCountriesInitial,
      countries: newRegions,
    };

    render(RegionSelector);
    expect(screen.getByText('Germany')).toBeOnTheScreen();
  });

  it('highlights country when regionCode exactly matches country code', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('fr'),
    };
    render(RegionSelector);
    expect(screen.getByText('France')).toBeOnTheScreen();
  });

  it('highlights country when regionCode starts with country code and state is selected', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    expect(screen.getByText('United States')).toBeOnTheScreen();
  });

  it('highlights state when selected in state view', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.getByText('California')).toBeOnTheScreen();
  });

  it('highlights state in grouped search results when parent country matches', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'California');
    expect(screen.getByText('California')).toBeOnTheScreen();
  });

  it('does not highlight state when country does not match', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('ca-on'),
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.getByText('California')).toBeOnTheScreen();
    expect(screen.getByText('New York')).toBeOnTheScreen();
  });

  it('does not highlight state when state ID does not match', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('us-ny'),
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.getByText('California')).toBeOnTheScreen();
    expect(screen.getByText('New York')).toBeOnTheScreen();
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
    expect(screen.getByText('California')).toBeOnTheScreen();
  });

  it('does not highlight country when regionCode does not match', () => {
    mockUserRegionValues = {
      ...mockUserRegionInitial,
      userRegion: createMockUserRegion('de'),
    };
    render(RegionSelector);
    expect(screen.getByText('United States')).toBeOnTheScreen();
    expect(screen.getByText('France')).toBeOnTheScreen();
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
    expect(screen.getByText('California')).toBeOnTheScreen();
  });
});
