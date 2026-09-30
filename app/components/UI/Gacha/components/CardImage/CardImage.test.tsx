import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { GachaCardImageTestIds } from '../../Gacha.testIds';
import CardImage from './CardImage';

const URI = 'https://example.com/card.png';
const PREVIEW_URI = 'https://example.com/card-medium.webp';

describe('CardImage', () => {
  it('shows a skeleton until the image is loaded', async () => {
    renderWithProvider(<CardImage uri={URI} />);

    expect(
      screen.getByTestId(GachaCardImageTestIds.SKELETON),
    ).toBeOnTheScreen();
    await waitFor(() =>
      expect(
        screen.queryByTestId(GachaCardImageTestIds.SKELETON),
      ).not.toBeOnTheScreen(),
    );
    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toBeOnTheScreen();
  });

  it('shows the fallback when the image fails to load', async () => {
    renderWithProvider(<CardImage uri={URI} />);

    fireEvent(screen.getByTestId(GachaCardImageTestIds.IMAGE), 'error');

    expect(
      await screen.findByTestId(GachaCardImageTestIds.FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardImageTestIds.IMAGE),
    ).not.toBeOnTheScreen();
  });

  it('shows the fallback without an image URL', () => {
    renderWithProvider(<CardImage />);

    expect(
      screen.getByTestId(GachaCardImageTestIds.FALLBACK),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(GachaCardImageTestIds.SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('displays the preview before loading the original without covering it with a skeleton', () => {
    renderWithProvider(<CardImage uri={URI} previewUri={PREVIEW_URI} />);
    const preview = screen.getByTestId(GachaCardImageTestIds.IMAGE);
    expect(preview).toHaveProp('source', { uri: PREVIEW_URI });

    fireEvent(preview, 'load', { source: { width: 600, height: 1000 } });

    const original = screen.getByTestId(GachaCardImageTestIds.IMAGE);
    expect(original).toHaveProp('source', { uri: URI });
    expect(original).toHaveProp('placeholder', { uri: PREVIEW_URI });
    expect(original).toHaveProp('placeholderContentFit', 'contain');
    expect(original).toHaveProp('transition', 150);
    expect(screen.queryByTestId(GachaCardImageTestIds.SKELETON)).toBeNull();
  });

  it('keeps the preview when the original image fails', () => {
    const onError = jest.fn();
    renderWithProvider(
      <CardImage uri={URI} previewUri={PREVIEW_URI} onError={onError} />,
    );
    fireEvent(screen.getByTestId(GachaCardImageTestIds.IMAGE), 'load', {
      source: { width: 600, height: 1000 },
    });

    fireEvent(screen.getByTestId(GachaCardImageTestIds.IMAGE), 'error');

    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toHaveProp(
      'source',
      { uri: PREVIEW_URI },
    );
    expect(screen.queryByTestId(GachaCardImageTestIds.SKELETON)).toBeNull();
    expect(screen.queryByTestId(GachaCardImageTestIds.FALLBACK)).toBeNull();
    expect(onError).not.toHaveBeenCalled();
  });

  it('keeps the loaded original when a preview becomes available later', () => {
    const { rerender } = renderWithProvider(<CardImage uri={URI} />);
    fireEvent(screen.getByTestId(GachaCardImageTestIds.IMAGE), 'load', {
      source: { width: 1200, height: 2000 },
    });

    rerender(<CardImage uri={URI} previewUri={PREVIEW_URI} />);

    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toHaveProp(
      'source',
      { uri: URI },
    );
    expect(screen.queryByTestId(GachaCardImageTestIds.SKELETON)).toBeNull();
  });

  it('tries the original after a preview failure and reports an error only if both fail', () => {
    const onError = jest.fn();
    renderWithProvider(
      <CardImage uri={URI} previewUri={PREVIEW_URI} onError={onError} />,
    );

    fireEvent(screen.getByTestId(GachaCardImageTestIds.IMAGE), 'error');

    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toHaveProp(
      'source',
      { uri: URI },
    );
    expect(onError).not.toHaveBeenCalled();

    fireEvent(screen.getByTestId(GachaCardImageTestIds.IMAGE), 'error');

    expect(
      screen.getByTestId(GachaCardImageTestIds.FALLBACK),
    ).toBeOnTheScreen();
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('loads the new preview when the card sources change', () => {
    const { rerender } = renderWithProvider(
      <CardImage uri={URI} previewUri={PREVIEW_URI} />,
    );
    fireEvent(screen.getByTestId(GachaCardImageTestIds.IMAGE), 'load', {
      source: { width: 600, height: 1000 },
    });

    rerender(
      <CardImage
        uri="https://example.com/other.png"
        previewUri="https://example.com/other-medium.webp"
      />,
    );

    expect(screen.getByTestId(GachaCardImageTestIds.IMAGE)).toHaveProp(
      'source',
      { uri: 'https://example.com/other-medium.webp' },
    );
    expect(
      screen.getByTestId(GachaCardImageTestIds.SKELETON),
    ).toBeOnTheScreen();
  });
});
