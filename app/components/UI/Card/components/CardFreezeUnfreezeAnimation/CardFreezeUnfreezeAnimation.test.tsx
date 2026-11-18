import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  return {
    ...actual,
    useRiveFile: jest.fn(() => ({ riveFile: null })),
    useRive: jest.fn(() => ({
      riveViewRef: null,
      setHybridRef: jest.fn(),
    })),
    useViewModelInstanceAsync: jest.fn(() => ({ instance: null })),
    useRiveTrigger: jest.fn(() => ({ fire: jest.fn() })),
    RiveView: jest.fn(() => null),
  };
});

jest.mock(
  '../../../../../animations/card_freeze_unfreeze.riv',
  () => 'card_freeze_unfreeze.riv',
);
jest.mock(
  '../../../../../images/mm_card_regular.png',
  () => 'mm_card_regular.png',
);

import CardFreezeUnfreezeAnimation from './CardFreezeUnfreezeAnimation';

describe('CardFreezeUnfreezeAnimation', () => {
  it('renders the static fallback while the Rive view is not ready', () => {
    const { queryByTestId } = render(
      <CardFreezeUnfreezeAnimation
        isFrozen={false}
        fallbackSource={1}
        width={300}
        testID="freeze-animation"
      />,
    );

    expect(queryByTestId('freeze-animation')).toBeOnTheScreen();
  });

  it('accepts the isFrozen prop without crashing while Rive is unavailable', () => {
    const { queryByTestId } = render(
      <CardFreezeUnfreezeAnimation
        isFrozen
        fallbackSource={1}
        width={300}
        testID="freeze-animation-frozen"
      />,
    );

    expect(queryByTestId('freeze-animation-frozen')).toBeOnTheScreen();
  });
});
