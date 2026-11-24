import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Theme, ThemeProvider } from '@metamask/design-system-twrnc-preset';
import { darkTheme, lightTheme } from '@metamask/design-tokens';

import OnboardingAnimation from './OnboardingAnimation';
import { OnboardingAnimationSelectorIDs } from './OnboardingAnimation.testIds';
import Device from '../../../util/device';
import { mockTheme, ThemeContext } from '../../../util/theme';

const WORDMARK_ID = OnboardingAnimationSelectorIDs.WORDMARK;

jest.mock('../../../images/branding/metamask-wordmark.svg', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockWordmark = (props: Record<string, unknown>) =>
    ReactActual.createElement(View, props);

  return MockWordmark;
});

jest.mock('../../../util/device', () => ({
  __esModule: true,
  default: {
    isMediumDevice: jest.fn(() => false),
  },
}));

describe('OnboardingAnimation', () => {
  const mockSetStartFoxAnimation = jest.fn();
  const mockOnInteractiveContentReady = jest.fn();

  const defaultProps = {
    children: <Text testID="test-children">Test Children</Text>,
    startOnboardingAnimation: false,
    setStartFoxAnimation: mockSetStartFoxAnimation,
    onInteractiveContentReady: mockOnInteractiveContentReady,
  };

  const renderAnimation = (
    props: Partial<React.ComponentProps<typeof OnboardingAnimation>> = {},
    colors: typeof lightTheme.colors = lightTheme.colors,
  ) =>
    render(
      <ThemeProvider theme={Theme.Light}>
        <ThemeContext.Provider value={{ ...mockTheme, colors }}>
          <OnboardingAnimation {...defaultProps} {...props} />
        </ThemeContext.Provider>
      </ThemeProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
    (Device.isMediumDevice as jest.Mock).mockReturnValue(false);
  });

  it('renders the wordmark and its children', () => {
    const { getByTestId } = renderAnimation();

    expect(getByTestId(WORDMARK_ID)).toBeOnTheScreen();
    expect(getByTestId('test-children')).toBeOnTheScreen();
  });

  it('leaves the fox animation idle until onboarding starts', () => {
    renderAnimation();

    expect(mockSetStartFoxAnimation).not.toHaveBeenCalled();
    expect(mockOnInteractiveContentReady).not.toHaveBeenCalled();
  });

  it('starts the fox animation and reports interactive content when onboarding starts', () => {
    const { rerender, getByTestId } = renderAnimation();

    rerender(
      <ThemeProvider theme={Theme.Light}>
        <ThemeContext.Provider value={mockTheme}>
          <OnboardingAnimation {...defaultProps} startOnboardingAnimation />
        </ThemeContext.Provider>
      </ThemeProvider>,
    );

    expect(mockSetStartFoxAnimation).toHaveBeenCalledTimes(1);
    expect(mockSetStartFoxAnimation).toHaveBeenCalledWith(true);
    expect(mockOnInteractiveContentReady).toHaveBeenCalledTimes(1);
    expect(getByTestId(WORDMARK_ID)).toBeOnTheScreen();
    expect(getByTestId('test-children')).toBeOnTheScreen();
  });

  it('reports interactive content once when onboarding stays started', () => {
    const { rerender } = renderAnimation({ startOnboardingAnimation: true });

    rerender(
      <ThemeProvider theme={Theme.Light}>
        <ThemeContext.Provider value={mockTheme}>
          <OnboardingAnimation {...defaultProps} startOnboardingAnimation />
        </ThemeContext.Provider>
      </ThemeProvider>,
    );

    expect(mockOnInteractiveContentReady).toHaveBeenCalledTimes(1);
    expect(mockSetStartFoxAnimation).toHaveBeenCalledTimes(1);
  });

  it('sizes the wordmark for regular devices', () => {
    const { getByTestId } = renderAnimation();

    expect(getByTestId(WORDMARK_ID).props).toEqual(
      expect.objectContaining({ width: 192, height: 104 }),
    );
  });

  it('sizes the wordmark for medium devices', () => {
    (Device.isMediumDevice as jest.Mock).mockReturnValue(true);

    const { getByTestId } = renderAnimation();

    expect(getByTestId(WORDMARK_ID).props).toEqual(
      expect.objectContaining({ width: 144, height: 78 }),
    );
  });

  it('colors the wordmark with text default in light theme', () => {
    const { getByTestId } = renderAnimation();

    expect(getByTestId(WORDMARK_ID).props.color).toBe(
      lightTheme.colors.text.default,
    );
  });

  it('wraps the wordmark with the renderWordmark output', () => {
    const { View } = jest.requireActual('react-native');
    const renderWordmark = (wordmark: React.ReactElement) => (
      <View testID="wordmark-wrapper">{wordmark}</View>
    );

    const { getByTestId } = renderAnimation({ renderWordmark });

    expect(getByTestId('wordmark-wrapper')).toBeOnTheScreen();
    expect(getByTestId(WORDMARK_ID)).toBeOnTheScreen();
  });

  it('colors the wordmark with text default in dark theme', () => {
    const { getByTestId } = renderAnimation({}, darkTheme.colors);

    expect(getByTestId(WORDMARK_ID).props.color).toBe(
      darkTheme.colors.text.default,
    );
  });
});
