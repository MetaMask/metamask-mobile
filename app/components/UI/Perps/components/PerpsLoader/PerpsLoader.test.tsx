import React from 'react';
import { render } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsLoader from './PerpsLoader';

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
    const { UNSAFE_getByType } = renderWithProvider(<PerpsLoader />);

    // When fullScreen, it wraps content in ScreenView
    const ScreenView = require('../../../../Base/ScreenView').default;
    expect(UNSAFE_getByType(ScreenView)).toBeTruthy();
  });

  it('should render inline when fullScreen is false', () => {
    const { UNSAFE_queryByType, getByTestId } = renderWithProvider(
      <PerpsLoader fullScreen={false} />,
    );

    // When not fullScreen, it doesn't wrap in ScreenView
    const ScreenView = require('../../../../Base/ScreenView').default;
    expect(UNSAFE_queryByType(ScreenView)).toBeNull();
  });

  it('should render ActivityIndicator', () => {
    const { UNSAFE_getByType } = renderWithProvider(<PerpsLoader />);
    const { ActivityIndicator } = require('react-native');

    const spinner = UNSAFE_getByType(ActivityIndicator);
    expect(spinner).toBeTruthy();
    expect(spinner.props.size).toBe('large');
    expect(spinner.props.color).toBe('#0376C9');
  });

  it('should apply correct styles for fullscreen mode', () => {
    const { UNSAFE_getByType } = renderWithProvider(<PerpsLoader />);
    const { View } = require('react-native');

    // Find the View that contains the ActivityIndicator
    const views = UNSAFE_getByType(View).findAllByType(View);
    const containerView = views.find(
      (view) => view.props.style === {}, // matches styles.container
    );

    expect(containerView).toBeTruthy();
  });

  it('should apply correct styles for inline mode', () => {
    const { UNSAFE_getByType } = renderWithProvider(
      <PerpsLoader fullScreen={false} />,
    );
    const { View } = require('react-native');

    const view = UNSAFE_getByType(View);
    expect(view.props.style).toEqual({}); // matches styles.inlineContainer
  });

  it('should render text with correct variant and color', () => {
    const { UNSAFE_getByType } = renderWithProvider(<PerpsLoader />);
    const Text =
      require('../../../../../component-library/components/Texts/Text').default;

    const text = UNSAFE_getByType(Text);
    expect(text.props.variant).toBe('TextVariant.BodyMD');
    expect(text.props.color).toBe('TextColor.Muted');
  });

  it('should handle empty message', () => {
    const { UNSAFE_getByType } = renderWithProvider(<PerpsLoader message="" />);
    const Text =
      require('../../../../../component-library/components/Texts/Text').default;

    const text = UNSAFE_getByType(Text);
    expect(text.props.children).toBe('');
  });

  it('should render different messages correctly', () => {
    const messages = [
      'Initializing...',
      'Loading positions...',
      'Fetching market data...',
      'Connecting to HyperLiquid...',
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
