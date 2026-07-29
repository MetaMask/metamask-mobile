import React from 'react';
import { render, act } from '@testing-library/react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import MoneyCardFlipAnimation from './MoneyCardFlipAnimation';
import { MoneyCardFlipAnimationTestIds } from './MoneyCardFlipAnimation.testIds';
import { useReduceMotionState } from '../../hooks/useReduceMotion';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

// Local prop-capturing wrapper around the global Nitro Rive mock so the
// rendered artboard and the onError callback are observable. The Nitro
// runtime has no `animationName` prop — the flip timeline is the default
// animation of the per-variant artboards, played via `autoPlay`.
const mockRiveViewProps: {
  current?: {
    testID?: string;
    artboardName?: string;
    autoPlay?: boolean;
    onError?: (error: RiveError) => void;
  };
} = {};

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  const ReactActual = jest.requireActual('react');
  const MockRiveView = (props: {
    testID?: string;
    artboardName?: string;
    autoPlay?: boolean;
    onError?: (error: RiveError) => void;
  }) => {
    mockRiveViewProps.current = props;
    return ReactActual.createElement(actual.RiveView, props);
  };
  return {
    __esModule: true,
    ...actual,
    RiveView: MockRiveView,
  };
});

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

jest.mock('../../hooks/useReduceMotion', () => ({
  useReduceMotionState: jest.fn(),
}));

const mockUseReduceMotionState = useReduceMotionState as jest.Mock;

describe('MoneyCardFlipAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockRiveViewProps.current = undefined;
    mockUseSelector.mockReturnValue(true);
    mockUseReduceMotionState.mockReturnValue(false);
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

  it('renders neither the Rive animation nor the static image while the variant is unknown', () => {
    const { queryByTestId } = render(<MoneyCardFlipAnimation />);

    expect(queryByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeNull();
    expect(
      queryByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('reserves the space without rendering content while the variant is unknown and animations are off', () => {
    mockUseReduceMotionState.mockReturnValue(true);

    const { queryByTestId, getByTestId } = render(<MoneyCardFlipAnimation />);

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeNull();
    expect(
      queryByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('holds the static image while reduce motion is unresolved so the flip never flashes', () => {
    mockUseReduceMotionState.mockReturnValue(null);

    const { queryByTestId, getByTestId } = render(
      <MoneyCardFlipAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeNull();
    expect(
      queryByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
    ).toBeNull();
  });

  it('renders the static image immediately when the flag is off and reduce motion is unresolved', () => {
    mockUseSelector.mockReturnValue(false);
    mockUseReduceMotionState.mockReturnValue(null);

    const { getByTestId, queryByTestId } = render(
      <MoneyCardFlipAnimation isMetalCard={false} />,
    );

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeNull();
  });

  it('renders the metal artboard with autoplay for a metal card', () => {
    render(<MoneyCardFlipAnimation isMetalCard />);

    expect(mockRiveViewProps.current?.artboardName).toBe(
      'Card Tilt Y Animation - Metal',
    );
    expect(mockRiveViewProps.current?.autoPlay).toBe(true);
  });

  it('renders the digital artboard with autoplay for a virtual card', () => {
    render(<MoneyCardFlipAnimation isMetalCard={false} />);

    expect(mockRiveViewProps.current?.artboardName).toBe(
      'Card Tilt Y Animation - Digital',
    );
    expect(mockRiveViewProps.current?.autoPlay).toBe(true);
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
    mockUseReduceMotionState.mockReturnValue(true);

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

    act(() =>
      mockRiveViewProps.current?.onError?.({
        message: 'boom',
        type: RiveErrorType.Unknown,
      }),
    );

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
    ).toBeOnTheScreen();
    expect(queryByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeNull();
  });

  it('uses the metal card image as static fallback for a metal card', () => {
    mockUseReduceMotionState.mockReturnValue(true);

    const { getByTestId } = render(<MoneyCardFlipAnimation isMetalCard />);

    expect(
      getByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE).props.source,
    ).toBe(mmCardMetal);
  });

  it('uses the regular card image as static fallback for a virtual card', () => {
    mockUseReduceMotionState.mockReturnValue(true);

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
