import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import { selectAiSocialGifApiEnabled } from '../../../../selectors/featureFlagController/socialGifApi';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import GifPickerSheet from './GifPickerSheet';
import { GifPickerSheetSelectorsIDs } from './GifPickerSheet.testIds';
import type { KlipyGif } from './klipyClient';
import { useGifs } from './useGifs';
import { useKlipyGifs } from './useKlipyGifs';

jest.mock('../../../../selectors/featureFlagController/socialGifApi', () => ({
  selectAiSocialGifApiEnabled: jest.fn(() => false),
}));

jest.mock('./useKlipyGifs', () => ({
  useKlipyGifs: jest.fn(),
}));

jest.mock('./useGifs', () => ({
  useGifs: jest.fn(),
}));

const mockUseKlipyGifs = jest.mocked(useKlipyGifs);
const mockUseGifs = jest.mocked(useGifs);
const mockGifApiEnabled = jest.mocked(selectAiSocialGifApiEnabled);

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
    mockGifApiEnabled.mockReturnValue(false);
    mockUseKlipyGifs.mockReturnValue(idle);
    mockUseGifs.mockReturnValue(idle);
  });

  it('selects a gif from the grid', () => {
    mockUseKlipyGifs.mockReturnValue({
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

  it('uses the social API client when aiSocialGifApi is on', () => {
    mockGifApiEnabled.mockReturnValue(true);
    mockUseGifs.mockReturnValue({
      ...idle,
      gifs: [cheers],
    });

    renderWithProvider(
      <GifPickerSheet onSelect={onSelect} onClose={onClose} />,
    );

    expect(screen.getByLabelText('Cheers')).toBeOnTheScreen();
    expect(mockUseGifs).toHaveBeenCalledWith('', true);
    expect(mockUseKlipyGifs).toHaveBeenCalledWith('', false);
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
