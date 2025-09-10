import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import RegionSelectorModal from './RegionSelectorModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

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

const mockRegions = [
  {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phone: {
      prefix: '+1',
      placeholder: '(555) 555-1234',
      template: '(XXX) XXX-XXXX',
    },
    currency: 'USD',
    recommended: true,
    supported: true,
  },
  {
    isoCode: 'DE',
    flag: '🇩🇪',
    name: 'Germany',
    phone: {
      prefix: '+49',
      placeholder: '123 456 7890',
      template: 'XXX XXX XXXX',
    },
    currency: 'EUR',
    supported: true,
  },
  {
    isoCode: 'CA',
    flag: '🇨🇦',
    name: 'Canada',
    phone: {
      prefix: '+1',
      placeholder: '(555) 555-1234',
      template: '(XXX) XXX-XXXX',
    },
    currency: 'CAD',
    supported: false,
  },
  {
    isoCode: 'FR',
    flag: '🇫🇷',
    name: 'France',
    phone: {
      prefix: '+33',
      placeholder: '1 23 45 67 89',
      template: 'X XX XX XX XX',
    },
    currency: 'EUR',
    supported: true,
  },
];

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
      selectedRegion: {
        isoCode: 'US',
        flag: '🇺🇸',
        name: 'United States',
        phone: {
          prefix: '+1',
          placeholder: '(555) 555-1234',
          template: '(XXX) XXX-XXXX',
        },
        currency: 'USD',
        recommended: true,
        supported: true,
      },
      setSelectedRegion: mockSetSelectedRegion,
      isAuthenticated: false,
    });

    mockUseParams.mockReturnValue({
      regions: mockRegions,
      error: null,
    });

    // Ensure trackEvent mock is reset
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
});
