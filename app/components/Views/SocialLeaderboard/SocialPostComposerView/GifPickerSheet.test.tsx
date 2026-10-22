import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import GifPickerSheet from './GifPickerSheet';
import { GifPickerSheetSelectorsIDs } from './GifPickerSheet.testIds';
import type { KlipyGif } from './klipyClient';
import { useKlipyGifs } from './useKlipyGifs';

jest.mock('./useKlipyGifs', () => ({
  useKlipyGifs: jest.fn(),
}));

const mockUseKlipyGifs = jest.mocked(useKlipyGifs);

const cheers: KlipyGif = {
  id: 'cheers',
  title: 'Cheers',
  previewUrl: 'https://media.test/cheers-sm.gif',
  gifUrl: 'https://media.test/cheers.gif',
};

const idle = {
  gifs: [] as KlipyGif[],
  isLoading: false,
  error: null,
  loadMore: jest.fn(),
  retry: jest.fn(),
};

describe('GifPickerSheet', () => {
  const onSelect = jest.fn();
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKlipyGifs.mockReturnValue(idle);
  });

  it('selects a gif from the grid', () => {
    mockUseKlipyGifs.mockReturnValue({
      ...idle,
      gifs: [cheers],
    });

    renderWithProvider(
      <GifPickerSheet onSelect={onSelect} onClose={onClose} />,
    );

    expect(screen.getByText('Cheers')).toBeOnTheScreen();
    fireEvent.press(
      screen.getByTestId(GifPickerSheetSelectorsIDs.item('cheers')),
    );

    expect(onSelect).toHaveBeenCalledWith('https://media.test/cheers.gif');
  });

  it('closes from the header button', () => {
    renderWithProvider(
      <GifPickerSheet onSelect={onSelect} onClose={onClose} />,
    );

    fireEvent.press(
      screen.getByTestId(GifPickerSheetSelectorsIDs.CLOSE_BUTTON),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('shows the missing api key message without a retry button', () => {
    mockUseKlipyGifs.mockReturnValue({
      ...idle,
      error: 'missing_api_key',
    });

    renderWithProvider(
      <GifPickerSheet onSelect={onSelect} onClose={onClose} />,
    );

    expect(
      screen.getByTestId(GifPickerSheetSelectorsIDs.ERROR),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('Add a Klipy API key to load GIFs'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId(GifPickerSheetSelectorsIDs.RETRY)).toBeNull();
  });

  it('retries after a failed load', () => {
    const retry = jest.fn();
    mockUseKlipyGifs.mockReturnValue({
      ...idle,
      error: 'request_failed',
      retry,
    });

    renderWithProvider(
      <GifPickerSheet onSelect={onSelect} onClose={onClose} />,
    );

    fireEvent.press(screen.getByTestId(GifPickerSheetSelectorsIDs.RETRY));

    expect(retry).toHaveBeenCalled();
  });
});
