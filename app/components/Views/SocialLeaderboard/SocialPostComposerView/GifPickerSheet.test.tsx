import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import GifPickerSheet from './GifPickerSheet';
import { GifPickerSheetSelectorsIDs } from './GifPickerSheet.testIds';
import type { Gif } from './gifClient';
import { useGifs } from './useGifs';

jest.mock('./useGifs', () => ({
  useGifs: jest.fn(),
}));

const mockUseGifs = jest.mocked(useGifs);

const cheers: Gif = {
  id: 'cheers',
  title: 'Cheers',
  previewUrl: 'https://media.test/cheers-sm.gif',
  gifUrl: 'https://media.test/cheers.gif',
};

const idle = {
  gifs: [] as Gif[],
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
    mockUseGifs.mockReturnValue(idle);
  });

  it('selects a gif from the grid', () => {
    mockUseGifs.mockReturnValue({
      ...idle,
      gifs: [cheers],
    });

    renderWithProvider(
      <GifPickerSheet onSelect={onSelect} onClose={onClose} />,
    );

    expect(screen.queryByText('Cheers')).toBeNull();
    expect(screen.getByLabelText('Cheers')).toBeOnTheScreen();
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

  it('retries after a failed load', () => {
    const retry = jest.fn();
    mockUseGifs.mockReturnValue({
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
