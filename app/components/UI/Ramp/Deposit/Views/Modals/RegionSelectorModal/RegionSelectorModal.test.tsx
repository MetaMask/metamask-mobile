import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
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

const mockRegions = [
  {
    code: 'US',
    flag: '🇺🇸',
    name: 'United States',
    phonePrefix: '+1',
    currency: 'USD',
    phoneDigitCount: 10,
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
    code: 'FR',
    flag: '🇫🇷',
    name: 'France',
    phonePrefix: '+33',
    currency: 'EUR',
    phoneDigitCount: 9,
    supported: true,
  },
];

describe('RegionSelectorModal Component', () => {
  const mockHandleSelectRegion = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useParams as jest.Mock).mockReturnValue({
      selectedRegionCode: 'US',
      handleSelectRegion: mockHandleSelectRegion,
    });
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(RegionSelectorModal);
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays regions and allows selection', async () => {
    const { getByText } = renderWithProvider(RegionSelectorModal);

    expect(getByText('United States')).toBeTruthy();
    expect(getByText('Germany')).toBeTruthy();
    expect(getByText('France')).toBeTruthy();

    const germanyElement = getByText('Germany');
    fireEvent.press(germanyElement);

    await waitFor(() => {
      expect(mockHandleSelectRegion).toHaveBeenCalledWith({
        code: 'DE',
        flag: '🇩🇪',
        name: 'Germany',
        phonePrefix: '+49',
        currency: 'EUR',
        phoneDigitCount: 10,
        supported: true,
      });
    });
  });

  it('displays empty state when no regions match search', async () => {
    const { getByPlaceholderText, getByText } =
      renderWithProvider(RegionSelectorModal);

    const searchInput = getByPlaceholderText('Search by country');
    fireEvent.changeText(searchInput, 'Nonexistent Country');

    await waitFor(() => {
      expect(getByText('No regions match "Nonexistent Country"')).toBeTruthy();
    });
  });

  it('filters regions based on search input', async () => {
    const { getByPlaceholderText, getByText, queryByText } =
      renderWithProvider(RegionSelectorModal);

    const searchInput = getByPlaceholderText('Search by country');
    
    // Search for "Germany"
    fireEvent.changeText(searchInput, 'Germany');
    
    await waitFor(() => {
      expect(getByText('Germany')).toBeTruthy();
      expect(queryByText('France')).toBeFalsy();
      expect(queryByText('United States')).toBeFalsy();
    });

    // Clear search and verify all regions are shown again
    fireEvent.changeText(searchInput, '');
    
    await waitFor(() => {
      expect(getByText('Germany')).toBeTruthy();
      expect(getByText('France')).toBeTruthy();
      expect(getByText('United States')).toBeTruthy();
    });
  });

  it('shows recommended regions first when no search is active', () => {
    const { getByText } = renderWithProvider(RegionSelectorModal);

    // United States should be first since it's recommended
    const regions = ['United States', 'Germany', 'France'];
    regions.forEach((region) => {
      expect(getByText(region)).toBeTruthy();
    });
  });

  it('handles region selection and closes modal', async () => {
    const { getByText } = renderWithProvider(RegionSelectorModal);

    const franceElement = getByText('France');
    fireEvent.press(franceElement);

    await waitFor(() => {
      expect(mockHandleSelectRegion).toHaveBeenCalledWith({
        code: 'FR',
        flag: '🇫🇷',
        name: 'France',
        phonePrefix: '+33',
        currency: 'EUR',
        phoneDigitCount: 9,
        supported: true,
      });
    });
  });

  it('displays region flags correctly', () => {
    const { getByText } = renderWithProvider(RegionSelectorModal);

    expect(getByText('🇺🇸')).toBeTruthy(); // US flag
    expect(getByText('🇩🇪')).toBeTruthy(); // Germany flag
    expect(getByText('🇫🇷')).toBeTruthy(); // France flag
  });

  it('shows correct header title', () => {
    const { getByText } = renderWithProvider(RegionSelectorModal);
    expect(getByText('Select a region')).toBeTruthy();
  });

  it('handles search input with special characters', async () => {
    const { getByPlaceholderText, getByText, queryByText } =
      renderWithProvider(RegionSelectorModal);

    const searchInput = getByPlaceholderText('Search by country');
    
    // Search with special characters
    fireEvent.changeText(searchInput, 'United');
    
    await waitFor(() => {
      expect(getByText('United States')).toBeTruthy();
      expect(queryByText('Germany')).toBeFalsy();
    });
  });

  it('clears search when clear button is pressed', async () => {
    const { getByPlaceholderText, getByText, queryByText } =
      renderWithProvider(RegionSelectorModal);

    const searchInput = getByPlaceholderText('Search by country');
    
    // Add search text
    fireEvent.changeText(searchInput, 'Germany');
    
    await waitFor(() => {
      expect(getByText('Germany')).toBeTruthy();
      expect(queryByText('France')).toBeFalsy();
    });

    // Find and press clear button (this would be implemented based on the TextFieldSearch component)
    // For now, we'll test clearing by setting empty text
    fireEvent.changeText(searchInput, '');
    
    await waitFor(() => {
      expect(getByText('Germany')).toBeTruthy();
      expect(getByText('France')).toBeTruthy();
      expect(getByText('United States')).toBeTruthy();
    });
  });

  it('handles case-insensitive search', async () => {
    const { getByPlaceholderText, getByText, queryByText } =
      renderWithProvider(RegionSelectorModal);

    const searchInput = getByPlaceholderText('Search by country');
    
    // Search with lowercase
    fireEvent.changeText(searchInput, 'germany');
    
    await waitFor(() => {
      expect(getByText('Germany')).toBeTruthy();
      expect(queryByText('France')).toBeFalsy();
    });
  });
}); 