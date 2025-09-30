import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import RegionSelectorModal from './RegionSelectorModal';
import Routes from '../../../../../../constants/navigation/Routes';
import { backgroundState } from '../../../../../../util/test/initial-root-state';
import { RampSDK } from '../../sdk';
import { RampType } from '../../types';
import { mockNetworkState } from '../../../../../../util/test/network';

const mockRegions = [
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
    states: [
      {
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
      },
    ],
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
          backgroundState: {
            ...backgroundState,
            NetworkController: {
              ...mockNetworkState({
                chainId: '0x1',
                id: 'mainnet',
                nickname: 'Ethereum Mainnet',
                ticker: 'ETH',
              }),
            },
          },
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
    const { toJSON } = render(RegionSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('filters regions based on search input', () => {
    const { getByPlaceholderText, toJSON } = render(RegionSelectorModal);

    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'Port');
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows empty state when search returns no results', () => {
    const { getByPlaceholderText, toJSON } = render(RegionSelectorModal);

    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'NonExistentCountry');

    expect(toJSON()).toMatchSnapshot();
  });

  it('clears search when clear button is pressed', () => {
    const { getByPlaceholderText, toJSON } = render(RegionSelectorModal);

    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'Port');

    // Should show filtered results
    expect(toJSON()).toMatchSnapshot();

    // Clear the search
    fireEvent.changeText(searchInput, '');

    // Should show all regions again
    expect(toJSON()).toMatchSnapshot();
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
    const { toJSON } = render(RegionSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles undefined regions gracefully', () => {
    mockUseParams.mockReturnValue({ regions: undefined });
    const { toJSON } = render(RegionSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });
});
