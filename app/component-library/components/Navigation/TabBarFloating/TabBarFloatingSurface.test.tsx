import React from 'react';
import { StyleSheet, Text } from 'react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import TabBarFloatingSurface from './TabBarFloatingSurface';

const TEST_ID = 'surface';

const renderSurface = (isGlassEnabled: boolean) =>
  renderWithProvider(
    <TabBarFloatingSurface
      twClassName="rounded-full"
      isGlassEnabled={isGlassEnabled}
      glassColorScheme="dark"
      testID={TEST_ID}
    >
      <Text>child</Text>
    </TabBarFloatingSurface>,
  );

describe('TabBarFloatingSurface', () => {
  it('renders its children on either path', () => {
    expect(renderSurface(true).getByText('child')).toBeOnTheScreen();
    expect(renderSurface(false).getByText('child')).toBeOnTheScreen();
  });

  // An opaque fill or border would sit on top of the material and defeat it.
  it('paints no fill of its own when glass is enabled', () => {
    const { getByTestId } = renderSurface(true);

    const style = StyleSheet.flatten(getByTestId(TEST_ID).props.style);

    expect(style.backgroundColor).toBeUndefined();
    expect(style.borderWidth).toBeUndefined();
  });

  it('passes the app-controlled appearance through to the glass view', () => {
    const { getByTestId } = renderSurface(true);

    expect(getByTestId(TEST_ID).props.colorScheme).toBe('dark');
    expect(getByTestId(TEST_ID).props.glassEffectStyle).toBe('regular');
  });

  it('falls back to an opaque section fill when glass is unavailable', () => {
    const { getByTestId } = renderSurface(false);

    const style = StyleSheet.flatten(getByTestId(TEST_ID).props.style);

    expect(style.backgroundColor).toEqual(expect.any(String));
    expect(style.borderWidth).toBeGreaterThan(0);
  });

  it('keeps the caller shape classes on both paths', () => {
    const radiusOf = (isGlassEnabled: boolean) =>
      StyleSheet.flatten(
        renderSurface(isGlassEnabled).getByTestId(TEST_ID).props.style,
      ).borderRadius;

    expect(radiusOf(true)).toBeGreaterThan(0);
    expect(radiusOf(true)).toBe(radiusOf(false));
  });
});
