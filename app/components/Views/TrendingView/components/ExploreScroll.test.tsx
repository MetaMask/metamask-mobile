import React from 'react';
import { ScrollView, Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import ExploreScroll from './ExploreScroll';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const style = jest.fn((...classes: string[]) => ({
    __twClasses: classes.join(' '),
  }));
  const twFn = Object.assign(() => ({}), { style });
  return { useTailwind: () => twFn };
});

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      icon: { default: '#000' },
      primary: { default: '#00f' },
    },
  }),
}));

describe('ExploreScroll', () => {
  it('does not apply horizontal padding on the scroll view', () => {
    const { UNSAFE_getByType } = render(
      <ExploreScroll
        refreshing={false}
        onRefresh={jest.fn()}
        testID="explore-scroll"
      >
        <Text>child</Text>
      </ExploreScroll>,
    );

    const scrollView = UNSAFE_getByType(ScrollView);
    const tw = useTailwind();
    const styleCalls = tw.style.mock.calls.map((call: string[]) =>
      call.join(' '),
    );

    expect(styleCalls).toContain('flex-1 pt-3');
    expect(styleCalls).not.toEqual(
      expect.arrayContaining([expect.stringContaining('px-4')]),
    );
    expect(scrollView.props.style.__twClasses).toBe('flex-1 pt-3');
  });
});
