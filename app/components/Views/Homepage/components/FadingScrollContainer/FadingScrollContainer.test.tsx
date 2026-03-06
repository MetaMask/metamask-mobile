import React from 'react';
import { ScrollView, Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FadingScrollContainer from './FadingScrollContainer';

jest.mock('react-native-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID, style, ...props }: Record<string, unknown>) => (
      <View testID="linear-gradient" style={style} {...props} />
    ),
  };
});

jest.mock('../../../../../util/theme', () => {
  const { mockTheme } = jest.requireActual('../../../../../util/theme');
  return {
    useTheme: () => mockTheme,
  };
});

jest.mock('../../../../../util/colors', () => ({
  colorWithOpacity: (color: string, _opacity: number) => color,
}));

describe('FadingScrollContainer', () => {
  it('renders children with scroll props', () => {
    render(
      <FadingScrollContainer>
        {(scrollProps) => (
          <ScrollView {...scrollProps} testID="inner-scroll">
            <Text>Content</Text>
          </ScrollView>
        )}
      </FadingScrollContainer>,
    );

    expect(screen.getByTestId('inner-scroll')).toBeOnTheScreen();
    expect(screen.getByText('Content')).toBeOnTheScreen();
  });

  it('renders fade gradient by default', () => {
    render(
      <FadingScrollContainer>
        {(scrollProps) => (
          <ScrollView {...scrollProps}>
            <Text>Content</Text>
          </ScrollView>
        )}
      </FadingScrollContainer>,
    );

    expect(screen.getByTestId('linear-gradient')).toBeOnTheScreen();
  });

  it('hides gradient when scrolled to end', () => {
    render(
      <FadingScrollContainer>
        {(scrollProps) => (
          <ScrollView {...scrollProps} testID="scroll">
            <Text>Content</Text>
          </ScrollView>
        )}
      </FadingScrollContainer>,
    );

    fireEvent.scroll(screen.getByTestId('scroll'), {
      nativeEvent: {
        contentOffset: { x: 500, y: 0 },
        contentSize: { width: 500, height: 100 },
        layoutMeasurement: { width: 400, height: 100 },
      },
    });

    expect(screen.queryByTestId('linear-gradient')).toBeNull();
  });
});
