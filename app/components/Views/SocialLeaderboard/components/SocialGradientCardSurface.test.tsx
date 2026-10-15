import React from 'react';
import { screen } from '@testing-library/react-native';
import { Text } from '@metamask/design-system-react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import SocialGradientCardSurface from './SocialGradientCardSurface';
import { SocialGradientCardSurfaceSelectorsIDs } from './SocialGradientCardSurface.testIds';

jest.mock('react-native-linear-gradient', () => {
  const { View } = jest.requireActual('react-native');
  return ({
    children,
    testID,
    style,
  }: {
    children: React.ReactNode;
    testID?: string;
    style?: Record<string, unknown>;
  }) => (
    <View testID={testID} style={style}>
      {children}
    </View>
  );
});

describe('SocialGradientCardSurface', () => {
  it('renders children on the gradient surface', () => {
    renderWithProvider(
      <SocialGradientCardSurface>
        <Text>card body</Text>
      </SocialGradientCardSurface>,
    );

    expect(
      screen.getByTestId(SocialGradientCardSurfaceSelectorsIDs.SURFACE),
    ).toBeOnTheScreen();
    expect(screen.getByText('card body')).toBeOnTheScreen();
  });

  it('paints the gradient as a layer behind the content', () => {
    renderWithProvider(
      <SocialGradientCardSurface>
        <Text>card body</Text>
      </SocialGradientCardSurface>,
    );

    const gradient = screen.getByTestId(
      SocialGradientCardSurfaceSelectorsIDs.GRADIENT,
    );

    expect(gradient).toBeOnTheScreen();
    expect(gradient).toHaveStyle({ position: 'absolute' });
  });

  it('outlines the card with the neutral hairline', () => {
    renderWithProvider(
      <SocialGradientCardSurface>
        <Text>card body</Text>
      </SocialGradientCardSurface>,
    );

    expect(
      screen.getByTestId(SocialGradientCardSurfaceSelectorsIDs.SURFACE),
    ).toHaveStyle({ borderWidth: 1 });
  });
});
