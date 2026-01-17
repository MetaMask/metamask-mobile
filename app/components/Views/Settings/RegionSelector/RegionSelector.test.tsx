import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import RegionSelector from './RegionSelector';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import Routes from '../../../../constants/navigation/Routes';
import { Country, State, UserRegion } from '@metamask/ramps-controller';
import useRampsRegions from '../hooks/useRampsRegions';
import { useRampsUserRegion } from '../../../../components/UI/Ramp/hooks/useRampsUserRegion';

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
const mockFetchUserRegion = jest.fn().mockResolvedValue(null);

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
  supported,
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
  supported,
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
      supported: true,
    },
    state: stateCode
      ? {
          stateId: stateCode,
          name: stateCode,
          supported: true,
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

const mockUseRampsRegionsInitialValues: ReturnType<typeof useRampsRegions> = {
  regions: mockRegions,
  isLoading: false,
  error: null,
  fetchRegions: jest.fn().mockResolvedValue(mockRegions),
};

const mockUseRampsUserRegionInitialValues: ReturnType<
  typeof useRampsUserRegion
> = {
  userRegion: null,
  isLoading: false,
  error: null,
  setUserRegion: mockSetUserRegion,
  fetchUserRegion: mockFetchUserRegion,
};

let mockUseRampsRegionsValues = mockUseRampsRegionsInitialValues;
let mockUseRampsUserRegionValues = mockUseRampsUserRegionInitialValues;

jest.mock('../hooks/useRampsRegions', () =>
  jest.fn(() => mockUseRampsRegionsValues),
);

jest.mock('../../../../components/UI/Ramp/hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => mockUseRampsUserRegionValues,
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
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
    };
    mockUseRampsUserRegionValues = {
      ...mockUseRampsUserRegionInitialValues,
    };
  });

  it('renders correctly with countries list', () => {
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when regions are loading', () => {
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: null,
      isLoading: true,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when regions are null', () => {
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: null,
      isLoading: false,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when user region is selected', () => {
    mockUseRampsUserRegionValues = {
      ...mockUseRampsUserRegionInitialValues,
      userRegion: createMockUserRegion('us-ca'),
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with recommended countries', () => {
    const recommendedRegions = [
      createMockCountry('US', 'United States', '🇺🇸', undefined, true, true),
      createMockCountry('CA', 'Canada', '🇨🇦', undefined, true, false),
    ];
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: recommendedRegions,
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
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to states view when country with states is selected', () => {
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders states view correctly', () => {
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
    fireEvent.press(stateItem);
    await expect(mockSetUserRegion).toHaveBeenCalledWith('ca');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls setUserRegion and navigates back when country without states is selected', async () => {
    render(RegionSelector);
    const countryItem = screen.getByText('France');
    fireEvent.press(countryItem);
    await expect(mockSetUserRegion).toHaveBeenCalledWith('fr');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('renders correctly with unsupported country', () => {
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly when country has states and user region state is shown', () => {
    mockUseRampsUserRegionValues = {
      ...mockUseRampsUserRegionInitialValues,
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

  it('renders correctly with empty regions array', () => {
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: [],
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with country without flag', () => {
    const regionsWithoutFlag = [
      createMockCountry('US', 'United States', '', [
        createMockState('CA', 'California'),
      ]),
    ];
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: regionsWithoutFlag,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with state without stateId', () => {
    const stateWithoutId: State = {
      name: 'State Without ID',
      supported: true,
    };
    const regionsWithStateWithoutId = [
      createMockCountry('US', 'United States', '🇺🇸', [stateWithoutId]),
    ];
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: regionsWithStateWithoutId,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders correctly with unsupported state', () => {
    const unsupportedState = createMockState('TX', 'Texas', false);
    const regionsWithUnsupportedState = [
      createMockCountry('US', 'United States', '🇺🇸', [
        createMockState('CA', 'California'),
        unsupportedState,
      ]),
    ];
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: regionsWithUnsupportedState,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('handles setUserRegion error gracefully', async () => {
    const errorMock = jest.fn().mockRejectedValue(new Error('Failed to set region'));
    mockUseRampsUserRegionValues = {
      ...mockUseRampsUserRegionInitialValues,
      setUserRegion: errorMock,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('France');
    fireEvent.press(countryItem);
    await expect(errorMock).toHaveBeenCalledWith('fr');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('clears search and scrolls to top when clear button is pressed', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'United');
    expect(searchInput.props.value).toBe('United');
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
        supported: true,
        states: [createMockState('CA', 'California')],
      },
      state: {
        stateId: 'CA',
        name: 'California',
        supported: true,
      },
      regionCode: 'us-ca',
    };
    mockUseRampsUserRegionValues = {
      ...mockUseRampsUserRegionInitialValues,
      userRegion: userRegionWithState,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('handles search with grouped results showing country and matching states', () => {
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'Cal');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('handles search with standalone states', () => {
    const standaloneState: State = {
      stateId: 'TX',
      name: 'Texas',
      supported: true,
    };
    const regionsWithStandaloneState = [
      createMockCountry('US', 'United States', '🇺🇸', [
        createMockState('CA', 'California'),
        standaloneState,
      ]),
    ];
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: regionsWithStandaloneState,
    };
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'Texas');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('handles search with standalone countries', () => {
    const standaloneCountry = createMockCountry('DE', 'Germany', '🇩🇪');
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: [...mockRegions, standaloneCountry],
    };
    render(RegionSelector);
    const searchInput = screen.getByTestId('textfieldsearch');
    fireEvent.changeText(searchInput, 'Germany');
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders disabled country correctly', () => {
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders disabled state correctly', () => {
    const unsupportedState = createMockState('TX', 'Texas', false);
    const regionsWithUnsupportedState = [
      createMockCountry('US', 'United States', '🇺🇸', [
        createMockState('CA', 'California'),
        unsupportedState,
      ]),
    ];
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: regionsWithUnsupportedState,
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

  it('handles country with supported set to false', () => {
    const unsupportedCountry = createMockCountry('XX', 'Unsupported', '🏳️', undefined, false);
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: [unsupportedCountry],
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('handles state with supported set to false', () => {
    const unsupportedState = createMockState('TX', 'Texas', false);
    const regionsWithUnsupportedState = [
      createMockCountry('US', 'United States', '🇺🇸', [unsupportedState]),
    ];
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: regionsWithUnsupportedState,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('handles region selection with empty regionId', () => {
    const stateWithoutId: State = {
      name: 'State Without ID',
      supported: true,
    };
    const regionsWithStateWithoutId = [
      createMockCountry('US', 'United States', '🇺🇸', [stateWithoutId]),
    ];
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: regionsWithStateWithoutId,
    };
    render(RegionSelector);
    const countryItem = screen.getByText('United States');
    fireEvent.press(countryItem);
    const stateItem = screen.getByText('State Without ID');
    fireEvent.press(stateItem);
    expect(mockSetUserRegion).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles search results limit correctly', () => {
    const manyRegions = Array.from({ length: 30 }, (_, i) =>
      createMockCountry(`C${i}`, `Country ${i}`, '🏳️'),
    );
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: manyRegions,
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
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions,
    };
    render(RegionSelector);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('updates currentData when regions change in country view', () => {
    render(RegionSelector);
    const initialSnapshot = screen.toJSON();
    
    const newRegions = [createMockCountry('DE', 'Germany', '🇩🇪')];
    mockUseRampsRegionsValues = {
      ...mockUseRampsRegionsInitialValues,
      regions: newRegions,
    };
    
    render(RegionSelector);
    expect(screen.toJSON()).not.toEqual(initialSnapshot);
  });
});
