import React from 'react';
import { Animated, Easing, View } from 'react-native';
import CollectibleOverview from './';
import configureMockStore from 'redux-mock-store';
import {
  fireEvent,
  render,
  screen,
  type RenderResult,
} from '@testing-library/react-native';
import { Provider } from 'react-redux';
import Device from '../../../util/device';
import { backgroundState } from '../../../util/test/initial-root-state';
import { ThemeContext, mockTheme } from '../../../util/theme';

const mockStore = configureMockStore();
const initialState = {
  collectibles: {
    favorites: {},
  },
  engine: {
    backgroundState,
  },
};
const store = mockStore(initialState);

const collectible = {
  name: 'Leopard',
  tokenId: 6904,
  address: '0x06012c8cf97BEaD5deAe237070F9587f8E7A266d',
  externalLink: 'https://nft.example.com',
  tradable: true,
};

const renderOverview = (): RenderResult =>
  render(
    <Provider store={store}>
      <ThemeContext.Provider value={mockTheme}>
        <CollectibleOverview collectible={collectible} openLink={jest.fn()} />
      </ThemeContext.Provider>
    </Provider>,
  );

interface LayoutEvent {
  nativeEvent: {
    layout: { x: number; y: number; width: number; height: number };
  };
}

const layoutEvent = (height: number): LayoutEvent => ({
  nativeEvent: {
    layout: { x: 0, y: 0, width: 320, height },
  },
});

describe('CollectibleOverview', () => {
  it('should render correctly', () => {
    renderOverview();
    expect(screen.getByText('Leopard')).toBeOnTheScreen();
  });

  it('snaps the sheet with one stable animated value after both layouts', () => {
    const timing = jest.spyOn(Animated, 'timing').mockImplementation(
      () =>
        ({
          start: jest.fn(),
          stop: jest.fn(),
          reset: jest.fn(),
        }) as unknown as Animated.CompositeAnimation,
    );
    const view = renderOverview();
    const sheet = view
      .UNSAFE_getAllByType(Animated.View)
      .find((node) => typeof node.props.onLayout === 'function');
    const header = view
      .UNSAFE_getAllByType(View)
      .find(
        (node) =>
          typeof node.props.onLayout === 'function' &&
          node.props.onLayout !== sheet?.props.onLayout,
      );

    if (!sheet || !header) {
      throw new Error('CollectibleOverview layout targets were not rendered');
    }

    const wrapperHeight = 400;
    const headerHeight = 80;
    const animationOffset = Device.hasNotch() ? 30 : 50;

    expect(timing).not.toHaveBeenCalled();

    fireEvent(sheet, 'layout', layoutEvent(wrapperHeight));

    expect(timing).not.toHaveBeenCalled();

    fireEvent(header, 'layout', layoutEvent(headerHeight));

    const animatedValue = timing.mock.calls[0]?.[0];
    const snapConfig = {
      toValue: wrapperHeight - headerHeight - animationOffset,
      duration: 0,
      easing: Easing.ease,
      useNativeDriver: true,
    };

    expect(timing).toHaveBeenCalledTimes(1);
    expect(animatedValue).toBeInstanceOf(Animated.Value);
    expect(timing.mock.calls[0]?.[1]).toStrictEqual(snapConfig);

    view.rerender(
      <Provider store={store}>
        <ThemeContext.Provider value={mockTheme}>
          <CollectibleOverview collectible={collectible} openLink={jest.fn()} />
        </ThemeContext.Provider>
      </Provider>,
    );

    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0]?.[0]).toBe(animatedValue);

    timing.mockRestore();
  });
});
