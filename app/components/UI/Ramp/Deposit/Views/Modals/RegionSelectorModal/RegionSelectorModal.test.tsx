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
      onRegionSelect: undefined,
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
    const { toJSON } = renderWithProvider(RegionSelectorModal);
    expect(toJSON()).toMatchSnapshot();
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
      onRegionSelect: undefined,
    });

    const { toJSON } = renderWithProvider(RegionSelectorModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('handles empty regions array from navigation params', () => {
    mockUseParams.mockReturnValue({
      regions: [],
    });

    const { toJSON } = renderWithProvider(RegionSelectorModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onRegionSelect callback when provided and region is selected', () => {
    const mockOnRegionSelect = jest.fn();

    mockUseParams.mockReturnValue({
      regions: mockRegions,
      onRegionSelect: mockOnRegionSelect,
    });

    const { getByText } = renderWithProvider(RegionSelectorModal);
    const germanyRegion = getByText('Germany');

    fireEvent.press(germanyRegion);

    expect(mockOnRegionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        isoCode: 'DE',
        name: 'Germany',
        supported: true,
      }),
    );
  });

  it('does not update global region when updateGlobalRegion is false', () => {
    mockUseParams.mockReturnValue({
      regions: mockRegions,
      onRegionSelect: undefined,
      updateGlobalRegion: false,
    });

    const { getByText } = renderWithProvider(RegionSelectorModal);
    const germanyRegion = getByText('Germany');

    fireEvent.press(germanyRegion);

    expect(mockSetSelectedRegion).not.toHaveBeenCalled();
  });

  it('does not track analytics when trackSelection is false', () => {
    mockUseParams.mockReturnValue({
      regions: mockRegions,
      onRegionSelect: undefined,
      trackSelection: false,
    });

    const { getByText } = renderWithProvider(RegionSelectorModal);
    const germanyRegion = getByText('Germany');

    fireEvent.press(germanyRegion);

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('render matches snapshot with allRegionsSelectable set to true', () => {
    mockUseParams.mockReturnValue({
      regions: mockRegions,
      onRegionSelect: undefined,
      allRegionsSelectable: true,
    });

    const { toJSON } = renderWithProvider(RegionSelectorModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot with custom selectedRegion', () => {
    const germanyRegion = mockRegions.find((r) => r.isoCode === 'DE');

    mockUseParams.mockReturnValue({
      regions: mockRegions,
      onRegionSelect: undefined,
      selectedRegion: germanyRegion,
    });

    const { toJSON } = renderWithProvider(RegionSelectorModal);

    expect(toJSON()).toMatchSnapshot();
  });

  it('allows selection of unsupported regions when allRegionsSelectable is true', () => {
    const mockOnRegionSelect = jest.fn();

    mockUseParams.mockReturnValue({
      regions: mockRegions,
      onRegionSelect: mockOnRegionSelect,
      allRegionsSelectable: true,
    });

    const { getByText } = renderWithProvider(RegionSelectorModal);
    const canadaRegion = getByText('Canada');

    fireEvent.press(canadaRegion);

    expect(mockOnRegionSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        isoCode: 'CA',
        name: 'Canada',
        supported: false,
      }),
    );
    expect(mockSetSelectedRegion).toHaveBeenCalled();
  });
});
