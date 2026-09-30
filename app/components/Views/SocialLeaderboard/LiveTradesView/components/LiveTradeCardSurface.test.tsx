import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import LiveTradeCardSurface from './LiveTradeCardSurface';
import { LiveTradeCardSurfaceSelectorsIDs } from './LiveTradeCardSurface.testIds';
import { Text } from '@metamask/design-system-react-native';

jest.mock('react-native-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return ({
    children,
    testID,
    colors,
    style,
  }: {
    children: React.ReactNode;
    testID?: string;
    colors?: string[];
    style?: Record<string, unknown>;
  }) => (
    <View testID={testID} colors={colors} style={style}>
      {children}
    </View>
  );
});

describe('LiveTradeCardSurface', () => {
  it('renders children on the gradient surface', () => {
    renderWithProvider(
      <LiveTradeCardSurface>
        <Text>card body</Text>
      </LiveTradeCardSurface>,
    );

    expect(
      screen.getByTestId(LiveTradeCardSurfaceSelectorsIDs.SURFACE),
    ).toBeOnTheScreen();
    expect(screen.getByText('card body')).toBeOnTheScreen();
  });

  it('paints the gradient as a layer behind the content so the card is sized by its rows', () => {
    renderWithProvider(
      <LiveTradeCardSurface>
        <Text>card body</Text>
      </LiveTradeCardSurface>,
    );

    const gradient = screen.getByTestId(
      LiveTradeCardSurfaceSelectorsIDs.GRADIENT,
    );

    expect(gradient).toBeOnTheScreen();
    expect(gradient).toHaveStyle({ position: 'absolute' });
    expect(gradient.props.children).toBeUndefined();
  });

  it('outlines the card with the neutral hairline rather than a tone border', () => {
    renderWithProvider(
      <LiveTradeCardSurface>
        <Text>card body</Text>
      </LiveTradeCardSurface>,
    );

    expect(
      screen.getByTestId(LiveTradeCardSurfaceSelectorsIDs.SURFACE),
    ).toHaveStyle({ borderWidth: 1 });
  });
});
