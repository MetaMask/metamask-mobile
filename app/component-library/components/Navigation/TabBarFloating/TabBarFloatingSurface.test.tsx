import React from 'react';
import { Text } from 'react-native';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import TabBarFloatingSurface from './TabBarFloatingSurface';
import { TAB_BAR_FLOATING_BLUR_INTENSITY } from './TabBarFloating.constants';

const mockBlurView = jest.fn();

jest.mock('expo-blur', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    BlurView: (props: Record<string, unknown>) => {
      mockBlurView(props);
      return ReactActual.createElement(View, props);
    },
  };
});

const TEST_ID = 'surface';

const renderSurface = (
  isBlurAvailable: boolean,
  colorScheme: 'light' | 'dark' = 'dark',
) =>
  renderWithProvider(
    <TabBarFloatingSurface
      isBlurAvailable={isBlurAvailable}
      colorScheme={colorScheme}
      twClassName="rounded-full"
      testID={TEST_ID}
    >
      <Text>Tabs</Text>
    </TabBarFloatingSurface>,
  );

describe('TabBarFloatingSurface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('draws a system chrome material where blur is supported', () => {
    renderSurface(true);

    expect(mockBlurView).toHaveBeenCalledWith(
      expect.objectContaining({
        tint: 'systemChromeMaterialDark',
        intensity: TAB_BAR_FLOATING_BLUR_INTENSITY,
      }),
    );
  });

  it('matches the material to the app theme rather than the system one', () => {
    renderSurface(true, 'light');

    expect(mockBlurView).toHaveBeenCalledWith(
      expect.objectContaining({ tint: 'systemChromeMaterialLight' }),
    );
  });

  it('paints a flat fill when no blur can be drawn', () => {
    const { getByTestId } = renderSurface(false);

    expect(getByTestId(TEST_ID)).toBeOnTheScreen();
    expect(mockBlurView).not.toHaveBeenCalled();
  });

  it.each([
    ['blurred', true],
    ['opaque', false],
  ])('renders its children on the %s path', (_name, isBlurAvailable) => {
    const { getByText } = renderSurface(isBlurAvailable);

    expect(getByText('Tabs')).toBeOnTheScreen();
  });
});
