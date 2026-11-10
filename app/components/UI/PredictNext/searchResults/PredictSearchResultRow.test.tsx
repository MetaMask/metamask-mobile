import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { PredictSearchResultRow } from './PredictSearchResultRow';
import {
  getPredictSearchResultRowTestId,
  PredictSearchResultRowTestIds,
} from './PredictSearchResultRow.testIds';
import type { PredictSearchResult } from './types';

// The image and icon are hidden from assistive tech, so queries opt in.
const HIDDEN = { includeHiddenElements: true };

const RESULT: PredictSearchResult = {
  id: 'market-1',
  title: 'Will Bitcoin reach $100k?',
  subtitle: 'Open',
  imageUrl: 'https://example.com/btc.png',
  intent: { type: 'home' },
};

describe('PredictSearchResultRow', () => {
  it('shows the title, the subtitle and the image', () => {
    renderWithProvider(
      <PredictSearchResultRow result={RESULT} onPress={jest.fn()} />,
    );

    expect(screen.getByText(RESULT.title)).toBeOnTheScreen();
    expect(screen.getByText(RESULT.subtitle)).toBeOnTheScreen();
    expect(
      screen.getByTestId(PredictSearchResultRowTestIds.IMAGE, HIDDEN),
    ).toHaveProp('source', { uri: RESULT.imageUrl });
    expect(
      screen.queryByTestId(
        PredictSearchResultRowTestIds.PLACEHOLDER_ICON,
        HIDDEN,
      ),
    ).not.toBeOnTheScreen();
  });

  it('shows the placeholder icon without an image', () => {
    const { imageUrl: _imageUrl, ...withoutImage } = RESULT;

    renderWithProvider(
      <PredictSearchResultRow result={withoutImage} onPress={jest.fn()} />,
    );

    expect(
      screen.getByTestId(
        PredictSearchResultRowTestIds.PLACEHOLDER_ICON,
        HIDDEN,
      ),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(PredictSearchResultRowTestIds.IMAGE, HIDDEN),
    ).not.toBeOnTheScreen();
  });

  it('is a button named by its text, with a decorative image or icon', () => {
    const { imageUrl: _imageUrl, ...withoutImage } = RESULT;
    const { rerender } = renderWithProvider(
      <PredictSearchResultRow result={RESULT} onPress={jest.fn()} />,
    );

    const row = screen.getByTestId(getPredictSearchResultRowTestId(RESULT.id));
    expect(row).toHaveProp('accessibilityRole', 'button');
    expect(screen.getByRole('button')).toHaveTextContent(
      `${RESULT.title}${RESULT.subtitle}`,
    );
    expect(
      screen.getByTestId(PredictSearchResultRowTestIds.IMAGE, HIDDEN),
    ).toHaveProp('importantForAccessibility', 'no-hide-descendants');

    rerender(
      <PredictSearchResultRow result={withoutImage} onPress={jest.fn()} />,
    );

    expect(
      screen.getByTestId(
        PredictSearchResultRowTestIds.PLACEHOLDER_ICON,
        HIDDEN,
      ),
    ).toHaveProp('accessible', false);
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    renderWithProvider(
      <PredictSearchResultRow result={RESULT} onPress={onPress} />,
    );

    fireEvent.press(
      screen.getByTestId(getPredictSearchResultRowTestId(RESULT.id)),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
