import React from 'react';
import { render, act } from '@testing-library/react-native';
import MoneyCardFlipAnimation from './MoneyCardFlipAnimation';
import { MoneyCardFlipAnimationTestIds } from './MoneyCardFlipAnimation.testIds';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

const mockOnErrorRef: { current?: (error: { message: string }) => void } = {};
const mockRiveProps: {
  current?: { artboardName?: string; animationName?: string };
} = {};

jest.mock('rive-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    Fit: { Contain: 'contain' },
    default: (props: {
      testID?: string;
      artboardName?: string;
      animationName?: string;
      onError?: (error: { message: string }) => void;
    }) => {
      mockOnErrorRef.current = props.onError;
      mockRiveProps.current = {
        artboardName: props.artboardName,
        animationName: props.animationName,
      };
      return ReactActual.createElement(RNView, { testID: props.testID });
    },
  };
});

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotion: jest.fn(),
}));

const mockUseReduceMotion = useReduceMotion as jest.Mock;

describe('MoneyCardFlipAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnErrorRef.current = undefined;
    mockRiveProps.current = undefined;
    mockUseSelector.mockReturnValue(true);
    mockUseReduceMotion.mockReturnValue(false);
  });

  it('renders the Rive animation when the flag is on and reduce motion is off', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyCardFlipAnimation isMetalCard={false} />,
    );

    expect(getByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeOnTheScreen();
    expect(
      queryByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('renders the metal artboard with the flip timeline for a metal card', () => {
    render(<MoneyCardFlipAnimation isMetalCard />);

    expect(mockRiveProps.current?.artboardName).toBe(
      'Card Tilt Y Animation - Metal',
    );
    expect(mockRiveProps.current?.animationName).toBe('yAnimation');
  });

  it('renders the digital artboard with the flip timeline for a virtual card', () => {
    render(<MoneyCardFlipAnimation isMetalCard={false} />);

    expect(mockRiveProps.current?.artboardName).toBe(
      'Card Tilt Y Animation - Digital',
    );
    expect(mockRiveProps.current?.animationName).toBe('yAnimation');
  });

  it('renders the static image when the feature flag is disabled', () => {
    mockUseSelector.mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <MoneyCardFlipAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeNull();
  });

  it('renders the static image when reduce motion is enabled', () => {
    mockUseReduceMotion.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <MoneyCardFlipAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeNull();
  });

  it('falls back to the static image when Rive reports an error', () => {
    const { getByTestId, queryByTestId } = render(
      <MoneyCardFlipAnimation isMetalCard={false} />,
    );

    act(() => mockOnErrorRef.current?.({ message: 'boom' }));

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeNull();
  });

  it('uses the metal card image as static fallback for a metal card', () => {
    mockUseReduceMotion.mockReturnValue(true);

    const { getByTestId } = render(<MoneyCardFlipAnimation isMetalCard />);

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE).props.source,
    ).toBe(mmCardMetal);
  });

  it('uses the regular card image as static fallback for a virtual card', () => {
    mockUseReduceMotion.mockReturnValue(true);

    const { getByTestId } = render(
      <MoneyCardFlipAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE).props.source,
    ).toBe(mmCardRegular);
  });

  it('applies the provided testID to the container', () => {
    const { getByTestId } = render(
      <MoneyCardFlipAnimation isMetalCard={false} testID="custom-flip-id" />,
    );

    expect(getByTestId('custom-flip-id')).toBeOnTheScreen();
  });

  it('applies the default container testID when none is provided', () => {
    const { getByTestId } = render(
      <MoneyCardFlipAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.CONTAINER),
    ).toBeOnTheScreen();
  });
});
