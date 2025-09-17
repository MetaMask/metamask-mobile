import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import RegionSelectorModal from './RegionSelectorModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import {
  MOCK_REGIONS_EXTENDED,
  MOCK_US_REGION,
  MOCK_EUR_REGION,
  MOCK_CA_REGION,
} from '../../../testUtils';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'RegionSelectorModal',
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

jest.mock('../../../sdk', () => ({
  useDepositSDK: jest.fn(),
}));

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails: jest.fn(() => () => ['MockedRoute', {}]),
}));

const mockTrackEvent = jest.fn();

jest.mock('../../../../hooks/useAnalytics', () => () => mockTrackEvent);

const mockRegions = MOCK_REGIONS_EXTENDED;

describe('RegionSelectorModal Component', () => {
  let mockSetSelectedRegion: jest.Mock;
  let mockUseDepositSDK: jest.Mock;
  let mockUseParams: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetSelectedRegion = jest.fn();
    mockUseDepositSDK = jest.requireMock('../../../sdk').useDepositSDK;
    mockUseParams = jest.requireMock(
      '../../../../../../../util/navigation/navUtils',
    ).useParams;

    mockUseDepositSDK.mockReturnValue({
      selectedRegion: { ...MOCK_US_REGION, recommended: true },
      setSelectedRegion: mockSetSelectedRegion,
      isAuthenticated: false,
    });

    mockUseParams.mockReturnValue({
      regions: mockRegions,
      error: null,
    });

    mockTrackEvent.mockClear();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(RegionSelectorModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot when searching for a country', () => {
    const { getByPlaceholderText, toJSON } =
      renderWithProvider(RegionSelectorModal);

    fireEvent.changeText(getByPlaceholderText('Search by country'), 'Germany');

    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot when search has no results', () => {
    const { getByPlaceholderText, toJSON } =
      renderWithProvider(RegionSelectorModal);

    fireEvent.changeText(
      getByPlaceholderText('Search by country'),
      'Nonexistent Country',
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls setSelectedRegion when a supported region is selected', () => {
    const { getByText } = renderWithProvider(RegionSelectorModal);

    const germanyRegion = getByText('Germany');
    fireEvent.press(germanyRegion);

    expect(mockSetSelectedRegion).toHaveBeenCalledWith(
      expect.objectContaining({
        isoCode: 'DE',
        name: 'Germany',
        supported: true,
      }),
    );
  });

  it('does not call setSelectedRegion when an unsupported region is selected', () => {
    const { getByText } = renderWithProvider(RegionSelectorModal);

    const canadaRegion = getByText('Canada');
    fireEvent.press(canadaRegion);

    expect(mockSetSelectedRegion).not.toHaveBeenCalled();
  });

  it('sorts recommended regions to the top when no search is active', () => {
    const { getAllByText } = renderWithProvider(RegionSelectorModal);
    const firstRegion = getAllByText('United States')[0];
    expect(firstRegion).toBeTruthy();
  });

  it('tracks RAMPS_REGION_SELECTED event when a supported region is selected', () => {
    const { getByText } = renderWithProvider(RegionSelectorModal);

    const germanyRegion = getByText('Germany');
    fireEvent.press(germanyRegion);

    expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_REGION_SELECTED', {
      ramp_type: 'DEPOSIT',
      region: 'DE',
      is_authenticated: false,
    });
  });

  it('does not track analytics event when an unsupported region is selected', () => {
    const { getByText } = renderWithProvider(RegionSelectorModal);

    const canadaRegion = getByText('Canada');
    fireEvent.press(canadaRegion);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('receives and uses regions from navigation params', () => {
    const customRegions = [MOCK_EUR_REGION, MOCK_CA_REGION];

    mockUseParams.mockReturnValue({
      regions: customRegions,
      error: null,
    });

    const { getByText } = renderWithProvider(RegionSelectorModal);

    expect(getByText('Germany')).toBeOnTheScreen();
    expect(getByText('Canada')).toBeOnTheScreen();
  });

  it('handles empty regions array from navigation params', () => {
    mockUseParams.mockReturnValue({
      regions: [],
      error: null,
    });

    const { toJSON } = renderWithProvider(RegionSelectorModal);

    expect(toJSON()).toMatchSnapshot();
  });
});
