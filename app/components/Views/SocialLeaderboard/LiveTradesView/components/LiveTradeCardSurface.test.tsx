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
  }: {
    children: React.ReactNode;
    testID?: string;
    colors?: string[];
  }) => (
    <View testID={testID} colors={colors}>
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
});
