import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import RegionSelector from './RegionSelector';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { Country, type UserRegion } from '@metamask/ramps-controller';
import { backgroundState } from '../../../../util/test/initial-root-state';

const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: mockSetOptions,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../hooks/useRampsRegions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../../../components/UI/Ramp/hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: jest.fn(),
}));

import useRampsRegions from '../hooks/useRampsRegions';
import { useRampsUserRegion } from '../../../../components/UI/Ramp/hooks/useRampsUserRegion';

const mockUseRampsRegions = useRampsRegions as jest.MockedFunction<
  typeof useRampsRegions
>;
const mockUseRampsUserRegion = useRampsUserRegion as jest.MockedFunction<
  typeof useRampsUserRegion
>;

const createMockUserRegion = (regionCode: string): UserRegion => {
  const parts = regionCode.toLowerCase().split('-');
  const countryCode = parts[0].toUpperCase();
  const stateCode = parts[1]?.toUpperCase();

  return {
    country: {
      isoCode: countryCode,
      flag: '🏳️',
      name: `Country ${countryCode}`,
      phone: { prefix: '', placeholder: '', template: '' },
      currency: '',
      supported: true,
    },
    state: stateCode
      ? {
          stateId: `${countryCode}-${stateCode}`,
          name: `State ${stateCode}`,
          supported: true,
        }
      : null,
    regionCode: regionCode.toLowerCase(),
  };
};

const createMockCountries = (): Country[] => [
  {
    isoCode: 'US',
    name: 'United States of America',
    flag: '🇺🇸',
    phone: { prefix: '+1', placeholder: '', template: '' },
    currency: 'USD',
    supported: true,
    recommended: true,
    states: [
      {
        stateId: 'US-CA',
        name: 'California',
        supported: true,
      },
      {
        stateId: 'US-NY',
        name: 'New York',
        supported: true,
      },
      {
        stateId: 'US-UT',
        name: 'Utah',
        supported: true,
      },
    ],
  },
  {
    isoCode: 'CA',
    name: 'Canada',
    flag: '🇨🇦',
    phone: { prefix: '+1', placeholder: '', template: '' },
    currency: 'CAD',
    supported: true,
    states: [
      {
        stateId: 'CA-ON',
        name: 'Ontario',
        supported: true,
      },
    ],
  },
  {
    isoCode: 'FR',
    name: 'France',
    flag: '🇫🇷',
    phone: { prefix: '+33', placeholder: '', template: '' },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'DE',
    name: 'Germany',
    flag: '🇩🇪',
    phone: { prefix: '+49', placeholder: '', template: '' },
    currency: 'EUR',
    supported: false,
  },
];

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      RampsController: {
        userRegion: null,
        requests: {},
      },
    },
  },
};

describe('RegionSelector', () => {
  const mockSetUserRegion = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampsRegions.mockReturnValue({
      regions: createMockCountries(),
      isLoading: false,
      error: null,
      fetchRegions: jest.fn(),
    });
    mockUseRampsUserRegion.mockReturnValue({
      userRegion: null,
      isLoading: false,
      error: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: mockSetUserRegion,
    });
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders country list', () => {
    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });
    expect(getByText('United States of America')).toBeTruthy();
    expect(getByText('Canada')).toBeTruthy();
    expect(getByText('France')).toBeTruthy();
  });

  it('renders region variation notice on country view', () => {
    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });
    expect(
      getByText(
        'Payment methods and available tokens may vary based on your region and our providers.',
      ),
    ).toBeTruthy();
  });

  it('searches for countries', () => {
    const { getByPlaceholderText, queryByText } = renderWithProvider(
      <RegionSelector />,
      {
        state: initialState,
      },
    );

    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'France');

    expect(queryByText('United States of America')).toBeNull();
    expect(queryByText('France')).toBeTruthy();
  });

  it('shows empty state when search has no results', () => {
    const { getByPlaceholderText, getByText } = renderWithProvider(
      <RegionSelector />,
      {
        state: initialState,
      },
    );

    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'Nonexistent');

    expect(getByText(/No region matches/)).toBeTruthy();
  });

  it('clears search when clear button is pressed', () => {
    const { getByPlaceholderText, getByText, queryByText } = renderWithProvider(
      <RegionSelector />,
      {
        state: initialState,
      },
    );

    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'France');
    expect(queryByText('United States of America')).toBeNull();

    const clearButton = getByText('Clear');
    fireEvent.press(clearButton);

    expect(getByText('United States of America')).toBeTruthy();
  });

  it('navigates to state view when country with states is pressed', () => {
    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    expect(getByText('California')).toBeTruthy();
    expect(getByText('New York')).toBeTruthy();
    expect(getByText('Utah')).toBeTruthy();
  });

  it('updates navigation title when viewing states', () => {
    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerLeft: expect.any(Function),
      }),
    );
  });

  it('sets navigation options with back button when viewing states', () => {
    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    expect(getByText('California')).toBeTruthy();
    expect(mockSetOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        headerLeft: expect.any(Function),
      }),
    );
  });

  it('calls setUserRegion when a country without states is selected', async () => {
    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    const franceRegion = getByText('France');
    fireEvent.press(franceRegion);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSetUserRegion).toHaveBeenCalledWith('fr');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls setUserRegion when a state is selected', async () => {
    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    const californiaState = getByText('California');
    fireEvent.press(californiaState);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSetUserRegion).toHaveBeenCalledWith('us-ca');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('highlights selected country', () => {
    const mockUserRegion = createMockUserRegion('fr');
    mockUserRegion.country.name = 'France';
    mockUseRampsUserRegion.mockReturnValue({
      userRegion: mockUserRegion,
      isLoading: false,
      error: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: mockSetUserRegion,
    });

    const { toJSON } = renderWithProvider(<RegionSelector />, {
      state: {
        ...initialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RampsController: {
              userRegion: mockUserRegion,
              requests: {},
            },
          },
        },
      },
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('highlights selected state', () => {
    const mockUserRegion = createMockUserRegion('us-ca');
    mockUserRegion.country.name = 'United States of America';
    mockUserRegion.state = {
      stateId: 'US-CA',
      name: 'California',
      supported: true,
    };
    mockUseRampsUserRegion.mockReturnValue({
      userRegion: mockUserRegion,
      isLoading: false,
      error: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: mockSetUserRegion,
    });

    const { getByText, toJSON } = renderWithProvider(<RegionSelector />, {
      state: {
        ...initialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RampsController: {
              userRegion: mockUserRegion,
              requests: {},
            },
          },
        },
      },
    });

    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    expect(toJSON()).toMatchSnapshot();
  });

  it('displays state name under country when user has state selected', () => {
    const mockUserRegion = createMockUserRegion('us-ut');
    mockUserRegion.country.name = 'United States of America';
    mockUserRegion.state = {
      stateId: 'US-UT',
      name: 'Utah',
      supported: true,
    };

    mockUseRampsUserRegion.mockReturnValue({
      userRegion: mockUserRegion,
      isLoading: false,
      error: null,
      fetchUserRegion: jest.fn(),
      setUserRegion: mockSetUserRegion,
    });

    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: {
        ...initialState,
        engine: {
          backgroundState: {
            ...backgroundState,
            RampsController: {
              userRegion: mockUserRegion,
              requests: {},
            },
          },
        },
      },
    });

    expect(getByText('United States of America')).toBeTruthy();
    expect(getByText('Utah')).toBeTruthy();
  });

  it('disables unsupported regions', () => {
    const { toJSON } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('sorts recommended countries first', () => {
    const { toJSON } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles empty regions list', () => {
    mockUseRampsRegions.mockReturnValue({
      regions: null,
      isLoading: false,
      error: null,
      fetchRegions: jest.fn(),
    });

    const { toJSON } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles loading state', () => {
    mockUseRampsRegions.mockReturnValue({
      regions: null,
      isLoading: true,
      error: null,
      fetchRegions: jest.fn(),
    });

    const { toJSON } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles error state', () => {
    mockUseRampsRegions.mockReturnValue({
      regions: null,
      isLoading: false,
      error: 'Failed to load regions',
      fetchRegions: jest.fn(),
    });

    const { toJSON } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('searches for states when in state view', () => {
    const { getByText, getByPlaceholderText, queryByText } = renderWithProvider(
      <RegionSelector />,
      {
        state: initialState,
      },
    );

    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    const searchInput = getByPlaceholderText('Search by state');
    fireEvent.changeText(searchInput, 'California');

    expect(queryByText('New York')).toBeNull();
    expect(queryByText('Utah')).toBeNull();
    expect(getByText('California')).toBeTruthy();
  });

  it('navigates back to country view when back button is pressed from state view', () => {
    const { getByText, getByTestId } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    expect(getByText('California')).toBeTruthy();

    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    expect(getByText('United States of America')).toBeTruthy();
    expect(getByText('Canada')).toBeTruthy();
  });

  it('handles error when setUserRegion fails', async () => {
    const mockError = new Error('Failed to set region');
    mockSetUserRegion.mockRejectedValueOnce(mockError);

    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    const franceRegion = getByText('France');
    fireEvent.press(franceRegion);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSetUserRegion).toHaveBeenCalledWith('fr');
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles state without stateId gracefully', async () => {
    const countriesWithoutStateId: Country[] = [
      {
        isoCode: 'US',
        name: 'United States of America',
        flag: '🇺🇸',
        phone: { prefix: '+1', placeholder: '', template: '' },
        currency: 'USD',
        supported: true,
        states: [
          {
            name: 'California',
            supported: true,
          },
        ],
      },
    ];

    mockUseRampsRegions.mockReturnValue({
      regions: countriesWithoutStateId,
      isLoading: false,
      error: null,
      fetchRegions: jest.fn(),
    });

    const { getByText } = renderWithProvider(<RegionSelector />, {
      state: initialState,
    });

    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    const californiaState = getByText('California');
    fireEvent.press(californiaState);

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockSetUserRegion).not.toHaveBeenCalled();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('clears search when in state view', () => {
    const { getByText, getByPlaceholderText, queryByText } = renderWithProvider(
      <RegionSelector />,
      {
        state: initialState,
      },
    );

    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    const searchInput = getByPlaceholderText('Search by state');
    fireEvent.changeText(searchInput, 'California');
    expect(queryByText('New York')).toBeNull();

    const clearButton = getByText('Clear');
    fireEvent.press(clearButton);

    expect(getByText('California')).toBeTruthy();
    expect(getByText('New York')).toBeTruthy();
  });
});
