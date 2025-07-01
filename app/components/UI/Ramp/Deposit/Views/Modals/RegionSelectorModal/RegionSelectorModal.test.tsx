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

// Mock the constants to control test data
jest.mock('../../../constants', () => ({
  DEPOSIT_REGIONS: [
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
          isoCode: 'DE',
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
  });
});
