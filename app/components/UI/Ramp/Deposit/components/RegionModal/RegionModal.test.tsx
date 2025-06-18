import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react-native';
import RegionModal from './RegionModal';
import { DEPOSIT_REGIONS } from '../../constants';

const mockOnRegionPress = jest.fn();
const mockDismiss = jest.fn();

const defaultProps = {
  isVisible: true,
  title: 'Select Region',
  description: 'Choose your region',
  data: DEPOSIT_REGIONS,
  selectedRegion: null,
  onRegionPress: mockOnRegionPress,
  dismiss: mockDismiss,
};

describe('RegionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot when visible', () => {
    render(<RegionModal {...defaultProps} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot when not visible', () => {
    render(<RegionModal {...defaultProps} isVisible={false} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('allows selection of supported regions', async () => {
    render(<RegionModal {...defaultProps} />);

    const austriaElement = screen.getByText('Austria');

    await act(async () => {
      fireEvent.press(austriaElement);
    });

    expect(mockOnRegionPress).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AT', name: 'Austria' }),
    );
  });

  it('prevents selection of unsupported regions', async () => {
    render(<RegionModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search by country');

    await act(async () => {
      fireEvent.changeText(searchInput, 'India');
    });

    await waitFor(() => {
      expect(screen.getByText('India')).toBeTruthy();
    });

    const indiaElement = screen.getByText('India');

    await act(async () => {
      fireEvent.press(indiaElement);
    });

    expect(mockOnRegionPress).not.toHaveBeenCalled();
  });

  it('render matches snapshot when showing states', async () => {
    render(<RegionModal {...defaultProps} />);

    const usElement = screen.getByText('United States');

    await act(async () => {
      fireEvent.press(usElement);
    });

    await waitFor(() => {
      expect(screen.getByText('Alabama')).toBeTruthy();
    });

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('allows selection of states', async () => {
    render(<RegionModal {...defaultProps} />);

    const usElement = screen.getByText('United States');

    await act(async () => {
      fireEvent.press(usElement);
    });

    await waitFor(() => {
      expect(screen.getByText('Alabama')).toBeTruthy();
    });

    const alabamaElement = screen.getByText('Alabama');

    await act(async () => {
      fireEvent.press(alabamaElement);
    });

    expect(mockOnRegionPress).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'AL', name: 'Alabama' }),
    );
  });

  it('render matches snapshot with search results', async () => {
    render(<RegionModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search by country');

    await act(async () => {
      fireEvent.changeText(searchInput, 'United States');
    });

    await waitFor(() => {
      expect(screen.getByText('United States')).toBeTruthy();
    });

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot with popular regions section', () => {
    render(<RegionModal {...defaultProps} />);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('render matches snapshot with empty search results', async () => {
    render(<RegionModal {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText('Search by country');

    await act(async () => {
      fireEvent.changeText(searchInput, 'NonExistentCountry');
    });

    await waitFor(() => {
      expect(screen.getByText('No region matches')).toBeTruthy();
    });

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
