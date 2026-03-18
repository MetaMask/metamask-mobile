import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PreviousSeasonView from './PreviousSeasonView';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return { ...actual };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({ title, onBack }: { title: string; onBack: () => void }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Text, null, title),
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

jest.mock('../components/PreviousSeason/PreviousSeasonSummary', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(View, {
        testID: 'previous-season-summary',
      }),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'rewards.previous_season_view.title': 'Previous Season',
    };
    return translations[key] || key;
  },
}));

describe('PreviousSeasonView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the safe area container', () => {
    const { getByTestId } = render(<PreviousSeasonView />);

    expect(getByTestId('previous-season-view-safe-area')).toBeOnTheScreen();
  });

  it('renders the header with the correct title', () => {
    const { getByText } = render(<PreviousSeasonView />);

    expect(getByText('Previous Season')).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = render(<PreviousSeasonView />);

    fireEvent.press(getByTestId('header-back-button'));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders PreviousSeasonSummary', () => {
    const { getByTestId } = render(<PreviousSeasonView />);

    expect(getByTestId('previous-season-summary')).toBeOnTheScreen();
  });
});
