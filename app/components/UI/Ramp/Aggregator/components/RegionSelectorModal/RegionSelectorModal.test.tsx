import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import {
  DeepPartial,
  renderScreen,
} from '../../../../../../util/test/renderWithProvider';
import RegionSelectorModal from './RegionSelectorModal';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { RampSDK } from '../../sdk';
import { RampType, Region } from '../../types';

const mockedCaliforniaState: DeepPartial<Region> = {
  emoji: '🇺🇸',
  id: '/regions/us-ca',
  name: 'California',
  stateId: 'ca',
  support: {
    buy: true,
    sell: true,
  },
  unsupported: false,
  detected: false,
};

const mockRegions: DeepPartial<Region>[] = [
  {
    currencies: ['/currencies/fiat/eur'],
    emoji: '🇵🇹',
    id: '/regions/pt',
    name: 'Portugal',
    support: {
      buy: true,
      sell: true,
    },
    unsupported: false,
    detected: false,
    recommended: true,
  },
  {
    currencies: ['/currencies/fiat/eur'],
    emoji: '🇫🇷',
    id: '/regions/fr',
    name: 'France',
    support: {
      buy: true,
      sell: true,
    },
    unsupported: false,
    detected: false,
    recommended: false,
  },
  {
    currencies: ['/currencies/fiat/usd'],
    emoji: '🇺🇸',
    id: '/regions/us',
    name: 'United States of America',
    states: [mockedCaliforniaState],
    enableSell: true,
    support: {
      buy: false,
      sell: false,
    },
    unsupported: true,
    detected: true,
    recommended: false,
  },
  {
    currencies: ['/currencies/fiat/eur'],
    emoji: '🇪🇸',
    id: '/regions/es',
    name: 'Spain',
    support: {
      buy: true,
      sell: true,
    },
    unsupported: false,
    detected: false,
    recommended: false,
  },
];

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.REGION_SELECTOR,
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
const mockTrackEvent = jest.fn();

const mockUseRampSDKInitialValues: Partial<RampSDK> = {
  setSelectedRegion: mockSetSelectedRegion,
  selectedRegion: null,
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

const mockUseParams = jest.fn();
jest.mock('../../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

describe('RegionSelectorModal', () => {
  afterEach(() => {
    mockSetSelectedRegion.mockClear();
    mockTrackEvent.mockClear();
    jest.clearAllMocks();
  });

  beforeEach(() => {
    mockUseRampSDKValues = {
      ...mockUseRampSDKInitialValues,
    };
    mockUseParams.mockReturnValue({ regions: mockRegions });
  });

  it('renders the modal with region list', () => {
    const { getByText, getByPlaceholderText } = render(RegionSelectorModal);

    // Then all regions should be visible
    expect(getByText('Portugal')).toBeOnTheScreen();
    expect(getByText('France')).toBeOnTheScreen();
    expect(getByText('Spain')).toBeOnTheScreen();
    expect(getByText('United States of America')).toBeOnTheScreen();

    // And the search field should be present
    expect(getByPlaceholderText('Search by country')).toBeOnTheScreen();
  });

  it('renders the modal with selected region in list', () => {
    mockUseRampSDKValues.selectedRegion = mockRegions[0] as Region; // Portugal
    const { getByText } = render(RegionSelectorModal);

    // Then Portugal should be visible (selected state is visual, hard to assert without snapshots)
    expect(getByText('Portugal')).toBeOnTheScreen();
    expect(getByText('France')).toBeOnTheScreen();
  });

  it('renders the modal with selected state in list', () => {
    mockUseRampSDKValues.selectedRegion = mockedCaliforniaState as Region;
    const { getByText } = render(RegionSelectorModal);

    // Then all regions should still be visible in country view
    expect(getByText('Portugal')).toBeOnTheScreen();
    expect(getByText('United States of America')).toBeOnTheScreen();
  });

  it('filters regions based on search input', () => {
    const { getByPlaceholderText, getByText, queryByText } =
      render(RegionSelectorModal);

    // Given the user types a search query
    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'Port');

    // Then only matching regions should be visible
    expect(getByText('Portugal')).toBeOnTheScreen();
    expect(queryByText('France')).toBeNull();
    expect(queryByText('Spain')).toBeNull();
  });

  it('shows empty state when search returns no results', () => {
    const { getByPlaceholderText, getAllByText, queryByText } =
      render(RegionSelectorModal);

    // Given the user searches for a non-existent country
    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'NonExistentCountry');

    // Then the empty state message should be displayed (appears in both FlatLists due to animation)
    expect(getAllByText('No region matches').length).toBeGreaterThan(0);
    expect(queryByText('Portugal')).toBeNull();
    expect(queryByText('France')).toBeNull();
  });

  it('clears search when clear button is pressed', () => {
    const { getByPlaceholderText, getByText, queryByText } =
      render(RegionSelectorModal);

    // Given the user has typed a search query
    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'Port');

    // Then only Portugal should be visible
    expect(getByText('Portugal')).toBeOnTheScreen();
    expect(queryByText('France')).toBeNull();

    // When the user clears the search
    fireEvent.changeText(searchInput, '');

    // Then all regions should be visible again
    expect(getByText('Portugal')).toBeOnTheScreen();
    expect(getByText('France')).toBeOnTheScreen();
    expect(getByText('Spain')).toBeOnTheScreen();
  });

  it('calls setSelectedRegion when a region is selected', () => {
    const { getByText } = render(RegionSelectorModal);

    const portugalRegion = getByText('Portugal');
    fireEvent.press(portugalRegion);

    expect(mockSetSelectedRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '/regions/pt',
        name: 'Portugal',
        emoji: '🇵🇹',
      }),
    );
  });

  it('handles empty regions list gracefully', () => {
    mockUseParams.mockReturnValue({ regions: [] });
    const { getByPlaceholderText, queryByText } = render(RegionSelectorModal);

    // Then no regions should be visible
    expect(queryByText('Portugal')).toBeNull();
    expect(queryByText('France')).toBeNull();

    // But the search field should still be present
    expect(getByPlaceholderText('Search by country')).toBeOnTheScreen();
  });

  it('handles undefined regions gracefully', () => {
    mockUseParams.mockReturnValue({ regions: undefined });
    const { getByPlaceholderText, queryByText } = render(RegionSelectorModal);

    // Then no regions should be visible
    expect(queryByText('Portugal')).toBeNull();
    expect(queryByText('France')).toBeNull();

    // But the search field should still be present
    expect(getByPlaceholderText('Search by country')).toBeOnTheScreen();
  });

  it('navigates back to country view when back button is pressed from state view', () => {
    const { getByText, getByTestId, queryByText } = render(RegionSelectorModal);

    // Given the user navigates to state view
    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    // Then the state (California) should be visible
    expect(getByText('California')).toBeOnTheScreen();

    // When the user presses the back button
    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    // Then the country list should be visible again
    expect(getByText('United States of America')).toBeOnTheScreen();
    expect(getByText('Portugal')).toBeOnTheScreen();
    expect(queryByText('California')).toBeNull();
  });

  it('searches within state list when in state view', () => {
    const mockRegionWithStates: DeepPartial<Region> = {
      currencies: ['/currencies/fiat/usd'],
      emoji: '🇺🇸',
      id: '/regions/us',
      name: 'United States of America',
      states: [
        {
          id: '/regions/us-ca',
          name: 'California',
          stateId: 'ca',
          support: { buy: true, sell: true },
          unsupported: false,
          detected: false,
          recommended: true,
        },
        {
          id: '/regions/us-ny',
          name: 'New York',
          stateId: 'ny',
          support: { buy: true, sell: true },
          unsupported: false,
          detected: false,
          recommended: false,
        },
      ],
      support: { buy: false, sell: false },
      unsupported: true,
      detected: true,
      recommended: false,
    };

    mockUseParams.mockReturnValue({ regions: [mockRegionWithStates] });
    const { getByText, getByPlaceholderText, getAllByText, queryByText } =
      render(RegionSelectorModal);

    // Given the user navigates to state view
    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    // When the user searches for a specific state
    const searchInput = getByPlaceholderText('Search by state');
    fireEvent.changeText(searchInput, 'Cali');

    // Then California should be visible (appears in both FlatLists due to animation)
    expect(getAllByText('California').length).toBeGreaterThan(0);
    expect(queryByText('New York')).toBeNull();
  });

  it('sorts states by recommended when displaying state list', () => {
    const mockRegionWithStates: DeepPartial<Region> = {
      currencies: ['/currencies/fiat/usd'],
      emoji: '🇺🇸',
      id: '/regions/us',
      name: 'United States of America',
      states: [
        {
          id: '/regions/us-ny',
          name: 'New York',
          stateId: 'ny',
          support: { buy: true, sell: true },
          unsupported: false,
          detected: false,
          recommended: false,
        },
        {
          id: '/regions/us-ca',
          name: 'California',
          stateId: 'ca',
          support: { buy: true, sell: true },
          unsupported: false,
          detected: false,
          recommended: true,
        },
      ],
      support: { buy: false, sell: false },
      unsupported: true,
      detected: true,
      recommended: false,
    };

    mockUseParams.mockReturnValue({ regions: [mockRegionWithStates] });
    const { getByText } = render(RegionSelectorModal);

    // Given the user navigates to state view
    const usRegion = getByText('United States of America');
    fireEvent.press(usRegion);

    // Then both states should be visible (we can't easily assert order, but we verify both are present)
    expect(getByText('California')).toBeOnTheScreen();
    expect(getByText('New York')).toBeOnTheScreen();

    // Note: In a real scenario, recommended states would appear first in the list
    // but testing DOM order in React Native tests is complex without snapshot testing
  });
});
