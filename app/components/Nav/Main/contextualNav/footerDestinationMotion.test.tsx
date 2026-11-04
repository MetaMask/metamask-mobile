import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import AnimatedFooterShell from './AnimatedFooterShell';
import { footerAnimator, getFooterTransitionId } from './footerMotion';

jest.mock('../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => 'WIFI',
}));
jest.mock('../../../../util/deviceCapability', () => ({
  getHardwareTier: () => 'HIGH',
}));
jest.mock(
  '../../../../component-library/components/Navigation/TabBarFloating/TabBarFloatingSurface',
  () => {
    const stubs = jest.requireActual('./tradeInPlaceStubs');
    return { __esModule: true, default: stubs.SurfaceStub };
  },
);
jest.mock('../../../../component-library/hooks/useBlurMaterial', () => ({
  useBlurMaterial: () => ({ isBlurAvailable: false, colorScheme: 'dark' }),
}));

const layout = {
  nativeEvent: { layout: { width: 320, height: 62, x: 0, y: 0 } },
};

describe('footer morph for hub destinations', () => {
  let animate: jest.SpiedFunction<typeof footerAnimator.animate>;

  beforeEach(() => {
    animate = jest.spyOn(footerAnimator, 'animate');
  });

  it.each([
    ['swap', 'perps'],
    ['perps', 'predictions'],
    ['predictions', 'swap'],
    ['dashboard', 'swap'],
    ['swap', 'dashboard'],
  ] as const)(
    'does not morph when the trade footer stays put from %s to %s',
    (fromTab, toTab) => {
      const from = getFooterTransitionId('trading', fromTab);
      const to = getFooterTransitionId('trading', toTab);
      expect(from).toBe(to);

      const view = render(
        <AnimatedFooterShell
          runMotion
          transitionId={from}
          home={<Text>Home</Text>}
          rest={<Text>{fromTab}</Text>}
        />,
      );

      fireEvent(view.getByTestId(`footer-set-${from}`), 'layout', layout);

      view.rerender(
        <AnimatedFooterShell
          runMotion
          transitionId={to}
          home={<Text>Home</Text>}
          rest={<Text>{toTab}</Text>}
        />,
      );

      expect(animate).not.toHaveBeenCalled();
      expect(view.getByText(toTab)).toBeOnTheScreen();
    },
  );

  it.each([
    ['trade', 'collectibles'],
    ['trade', 'default'],
    ['trade', 'money'],
    ['collectibles', 'default'],
    ['default', 'trade'],
    ['money', 'trade'],
  ])('runs the morph from %s to %s', (from, to) => {
    const view = render(
      <AnimatedFooterShell
        runMotion
        transitionId={from}
        home={<Text>Home</Text>}
        rest={<Text>{from}</Text>}
      />,
    );

    fireEvent(view.getByTestId(`footer-set-${from}`), 'layout', layout);

    view.rerender(
      <AnimatedFooterShell
        runMotion
        transitionId={to}
        home={<Text>Home</Text>}
        rest={<Text>{to}</Text>}
      />,
    );

    expect(animate).toHaveBeenCalled();
    const motion = animate.mock.calls.at(-1)?.[6];
    expect(motion).toBe('morph');
    expect(view.getByText('Home')).toBeOnTheScreen();
    expect(view.getByText(from)).toBeOnTheScreen();
  });
});
