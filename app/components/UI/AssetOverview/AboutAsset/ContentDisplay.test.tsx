import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { strings } from '../../../../../locales/i18n';
import ContentDisplay, {
  CONTENT_DISPLAY_MEASURE_TEST_ID,
  CONTENT_DISPLAY_TOGGLE_TEST_ID,
} from './ContentDisplay';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'asset_overview.about_content_display.show_more': 'Show more',
      'asset_overview.about_content_display.show_less': 'Show less',
    };

    return translations[key] ?? key;
  },
}));

const DESCRIPTION = 'Pepe the frog is a meme token.';
const DISCLAIMER =
  'Market data is provided by third-party sources. Data is for informational purposes only.';

const SHOW_MORE = strings('asset_overview.about_content_display.show_more');
const SHOW_LESS = strings('asset_overview.about_content_display.show_less');

const fireMeasureLayout = (lineCount: number) => {
  act(() => {
    fireEvent(
      screen.getByTestId(CONTENT_DISPLAY_MEASURE_TEST_ID, {
        includeHiddenElements: true,
      }),
      'onTextLayout',
      {
        nativeEvent: {
          lines: Array.from({ length: lineCount }, (_, index) => ({
            text: `line ${index + 1}`,
            x: 0,
            y: 0,
            width: 100,
            height: 20,
          })),
        },
      },
    );
  });
};

describe('ContentDisplay', () => {
  it('hides the toggle when the text fits within numberOfLines', () => {
    render(<ContentDisplay content={DESCRIPTION} />);

    fireMeasureLayout(3);

    expect(
      screen.queryByTestId(CONTENT_DISPLAY_TOGGLE_TEST_ID),
    ).not.toBeOnTheScreen();
    expect(screen.queryByText(SHOW_MORE)).not.toBeOnTheScreen();
    expect(screen.queryByText(SHOW_LESS)).not.toBeOnTheScreen();
  });

  it('shows Show more when the text exceeds numberOfLines', () => {
    render(<ContentDisplay content={DESCRIPTION} />);

    fireMeasureLayout(4);

    expect(
      screen.getByTestId(CONTENT_DISPLAY_TOGGLE_TEST_ID),
    ).toBeOnTheScreen();
    expect(screen.getByText(SHOW_MORE)).toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTION).props.numberOfLines).toBe(3);
  });

  it('removes the line clamp and shows Show less after pressing the toggle', () => {
    render(<ContentDisplay content={DESCRIPTION} />);
    fireMeasureLayout(4);

    fireEvent.press(screen.getByTestId(CONTENT_DISPLAY_TOGGLE_TEST_ID));

    expect(screen.getByText(SHOW_LESS)).toBeOnTheScreen();
    expect(screen.queryByText(SHOW_MORE)).not.toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTION).props.numberOfLines).toBeUndefined();
  });

  it('restores the line clamp and Show more after pressing the toggle again', () => {
    render(<ContentDisplay content={DESCRIPTION} />);
    fireMeasureLayout(4);
    fireEvent.press(screen.getByTestId(CONTENT_DISPLAY_TOGGLE_TEST_ID));

    fireEvent.press(screen.getByTestId(CONTENT_DISPLAY_TOGGLE_TEST_ID));

    expect(screen.getByText(SHOW_MORE)).toBeOnTheScreen();
    expect(screen.queryByText(SHOW_LESS)).not.toBeOnTheScreen();
    expect(screen.getByText(DESCRIPTION).props.numberOfLines).toBe(3);
  });

  it('renders disclaimer after expanding truncated content', () => {
    render(<ContentDisplay content={DESCRIPTION} disclaimer={DISCLAIMER} />);
    fireMeasureLayout(4);

    expect(screen.queryByText(DISCLAIMER)).not.toBeOnTheScreen();

    fireEvent.press(screen.getByTestId(CONTENT_DISPLAY_TOGGLE_TEST_ID));

    expect(screen.getByText(DISCLAIMER)).toBeOnTheScreen();
  });
});
