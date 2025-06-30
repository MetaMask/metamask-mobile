import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import RegionSelectorModal from './RegionSelectorModal';
import { useParams } from '../../../../../../../util/navigation/navUtils';
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

jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: jest.fn(),
}));

jest.mock('../../../constants', () => ({
  DEPOSIT_REGIONS: [
    {
      code: 'US',
      flag: '🇺🇸',
      name: 'United States',
      phonePrefix: '+1',
      currency: 'USD',
      phoneDigitCount: 10,
      recommended: true,
      supported: true,
    },
    {
      code: 'DE',
      flag: '🇩🇪',
      name: 'Germany',
      phonePrefix: '+49',
      currency: 'EUR',
      phoneDigitCount: 10,
      supported: true,
    },
    {
      code: 'CA',
      flag: '🇨🇦',
      name: 'Canada',
      phonePrefix: '+1',
      currency: 'CAD',
      phoneDigitCount: 10,
      supported: false,
    },
    {
      code: 'FR',
      flag: '🇫🇷',
      name: 'France',
      phonePrefix: '+33',
      currency: 'EUR',
      phoneDigitCount: 9,
      supported: true,
    },
  ],
}));

describe('RegionSelectorModal Component', () => {
  let mockHandleSelectRegion: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockHandleSelectRegion = jest.fn();
    (useParams as jest.Mock).mockReturnValue({
      selectedRegionCode: 'US',
      handleSelectRegion: mockHandleSelectRegion,
    });
  });

  describe('region selector modal', () => {
    it('renders the default modal', () => {
      const { toJSON } = renderWithProvider(RegionSelectorModal);
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders with search results', () => {
      const { getByPlaceholderText, toJSON } =
        renderWithProvider(RegionSelectorModal);
      fireEvent.changeText(
        getByPlaceholderText('Search by country'),
        'Germany',
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('renders empty state', () => {
      const { getByPlaceholderText, toJSON } =
        renderWithProvider(RegionSelectorModal);
      fireEvent.changeText(
        getByPlaceholderText('Search by country'),
        'Nonexistent Country',
      );
      expect(toJSON()).toMatchSnapshot();
    });

    it('calls handleSelectRegion when supported region is pressed', () => {
      const { getByText } = renderWithProvider(RegionSelectorModal);
      
      const germanyRegion = getByText('Germany');
      fireEvent.press(germanyRegion);

      expect(mockHandleSelectRegion).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'DE',
          name: 'Germany',
          supported: true,
        }),
      );
    });

    it('does not call handleSelectRegion when unsupported region is pressed', () => {
      const { getByText } = renderWithProvider(RegionSelectorModal);
      
      const canadaRegion = getByText('Canada');
      fireEvent.press(canadaRegion);

      expect(mockHandleSelectRegion).not.toHaveBeenCalled();
    });

    it('handles undefined handleSelectRegion gracefully', () => {
      (useParams as jest.Mock).mockReturnValue({
        selectedRegionCode: 'US',
        handleSelectRegion: undefined,
      });

      const { getByText } = renderWithProvider(RegionSelectorModal);
      
      const germanyRegion = getByText('Germany');
      fireEvent.press(germanyRegion);

      expect(mockHandleSelectRegion).not.toHaveBeenCalled();
    });

    it('sorts recommended regions to the top when no search is active', () => {
      jest.doMock('../../../constants', () => ({
        DEPOSIT_REGIONS: [
          {
            code: 'UK',
            flag: '🇬🇧',
            name: 'United Kingdom',
            phonePrefix: '+44',
            currency: 'GBP',
            phoneDigitCount: 10,
            recommended: true,
            supported: true,
          },
          {
            code: 'AU',
            flag: '🇦🇺',
            name: 'Australia',
            phonePrefix: '+61',
            currency: 'AUD',
            phoneDigitCount: 9,
            supported: true,
          },
          {
            code: 'JP',
            flag: '🇯🇵',
            name: 'Japan',
            phonePrefix: '+81',
            currency: 'JPY',
            phoneDigitCount: 10,
            recommended: true,
            supported: true,
          },
          {
            code: 'BR',
            flag: '🇧🇷',
            name: 'Brazil',
            phonePrefix: '+55',
            currency: 'BRL',
            phoneDigitCount: 10,
            supported: false,
          },
        ],
      }));

      const { toJSON } = renderWithProvider(RegionSelectorModal);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
