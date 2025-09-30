import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsLoader from './PerpsLoader';
import { PerpsLoaderSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Mock useStyles
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: jest.fn(() => ({
    styles: {
      container: {},
      inlineContainer: {},
      spinner: {},
      loadingText: {},
    },
    theme: {
      colors: {
        primary: {
          default: '#0376C9',
        },
      },
    },
  })),
}));

describe('PerpsLoader', () => {
  it('should render with default message', () => {
    const { getByText } = renderWithProvider(<PerpsLoader />);

    expect(getByText('Connecting to Perps...')).toBeTruthy();
  });

  it('should render with custom message', () => {
    const customMessage = 'Loading account data...';
    const { getByText } = renderWithProvider(
      <PerpsLoader message={customMessage} />,
    );

    expect(getByText(customMessage)).toBeTruthy();
  });

  it('should render fullscreen by default', () => {
    const { getByTestId } = renderWithProvider(<PerpsLoader />);

    // When fullScreen, it wraps content in ScreenView
    expect(getByTestId(PerpsLoaderSelectorsIDs.FULLSCREEN)).toBeTruthy();
  });

  it('should render inline when fullScreen is false', () => {
    const { queryByTestId, getByTestId } = renderWithProvider(
      <PerpsLoader fullScreen={false} />,
    );

    // When not fullScreen, it doesn't wrap in ScreenView
    expect(queryByTestId(PerpsLoaderSelectorsIDs.FULLSCREEN)).toBeNull();
    expect(getByTestId(PerpsLoaderSelectorsIDs.INLINE)).toBeTruthy();
  });

  it('should render ActivityIndicator', () => {
    const { getByTestId } = renderWithProvider(<PerpsLoader />);

    const spinner = getByTestId(PerpsLoaderSelectorsIDs.SPINNER);
    expect(spinner).toBeTruthy();
    expect(spinner.props.size).toBe('large');
    expect(spinner.props.color).toBe('#0376C9');
  });

  it('should apply correct styles for inline mode', () => {
    const { getByTestId } = renderWithProvider(
      <PerpsLoader fullScreen={false} />,
    );

    const container = getByTestId(PerpsLoaderSelectorsIDs.INLINE);
    expect(container.props.style).toEqual({}); // matches styles.inlineContainer
  });

  it('should handle empty message', () => {
    const { getByTestId } = renderWithProvider(<PerpsLoader message="" />);

    const text = getByTestId(PerpsLoaderSelectorsIDs.TEXT);
    expect(text.props.children).toBe('');
  });

  it('should render different messages correctly', () => {
    const messages = [
      'Initializing...',
      'Loading positions...',
      'Fetching market data...',
      'Connecting to Perps...',
    ];

    messages.forEach((message) => {
      const { getByText, unmount } = renderWithProvider(
        <PerpsLoader message={message} />,
      );
      expect(getByText(message)).toBeTruthy();
      unmount();
    });
  });
});
