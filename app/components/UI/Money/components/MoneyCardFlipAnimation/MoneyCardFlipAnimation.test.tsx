import React from 'react';
import { render, act } from '@testing-library/react-native';
import MoneyCardFlipAnimation from './MoneyCardFlipAnimation';
import { MoneyCardFlipAnimationTestIds } from './MoneyCardFlipAnimation.testIds';
import { useReduceMotionState } from '../../hooks/useReduceMotion';
import { RIVE_REVEAL_FALLBACK_DELAY_MS } from '../../hooks/useRiveRevealTrigger';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

const mockTrigger = jest.fn();
const mockViewTag = jest.fn((): number | null => 1);
const mockDataBinding = { autoBind: true };
const mockAutoBind = jest.fn((_autoBind: boolean) => mockDataBinding);
const mockOnPlayRef: { current?: () => void } = {};
const mockOnErrorRef: { current?: (error: { message: string }) => void } = {};
const mockRiveProps: {
  current?: {
    artboardName?: string;
    animationName?: string;
    stateMachineName?: string;
    dataBinding?: unknown;
  };
} = {};
const mockMountCount = { current: 0 };

jest.mock('rive-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    __esModule: true,
    // Called through rather than passed directly: the factory runs before the
    // module body, so `mockAutoBind` is not bound yet at that point.
    AutoBind: (autoBind: boolean) => mockAutoBind(autoBind),
    Fit: { Contain: 'contain' },
    default: ReactActual.forwardRef(
      (
        props: {
          testID?: string;
          artboardName?: string;
          animationName?: string;
          stateMachineName?: string;
          dataBinding?: unknown;
          onError?: (error: { message: string }) => void;
          onPlay?: () => void;
        },
        ref: React.Ref<{
          trigger: (path: string) => void;
          viewTag: () => number | null;
        }>,
      ) => {
        mockOnErrorRef.current = props.onError;
        mockOnPlayRef.current = props.onPlay;
        mockRiveProps.current = {
          artboardName: props.artboardName,
          animationName: props.animationName,
          stateMachineName: props.stateMachineName,
          dataBinding: props.dataBinding,
        };
        ReactActual.useImperativeHandle(ref, () => ({
          trigger: mockTrigger,
          viewTag: mockViewTag,
        }));
        ReactActual.useEffect(() => {
          mockMountCount.current += 1;
        }, []);
        return ReactActual.createElement(RNView, { testID: props.testID });
      },
    ),
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
    mockOnErrorRef.current = undefined;
    mockOnPlayRef.current = undefined;
    mockRiveProps.current = undefined;
    mockMountCount.current = 0;
    mockViewTag.mockReturnValue(1);
    mockAutoBind.mockReturnValue(mockDataBinding);
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

  it('renders the metal artboard for a metal card', () => {
    render(<MoneyCardFlipAnimation isMetalCard />);

    expect(mockRiveProps.current?.artboardName).toBe('CardTiltMetal');
  });

  it('renders the digital artboard for a virtual card', () => {
    render(<MoneyCardFlipAnimation isMetalCard={false} />);

    expect(mockRiveProps.current?.artboardName).toBe('CardTiltDigital');
  });

  it('drives the entrance through the state machine rather than a named timeline', () => {
    render(<MoneyCardFlipAnimation isMetalCard={false} />);

    expect(mockRiveProps.current?.stateMachineName).toBe('State Machine 1');
    expect(mockRiveProps.current?.animationName).toBeUndefined();
  });

  it('binds the artboard view model so the reveal trigger resolves', () => {
    render(<MoneyCardFlipAnimation isMetalCard={false} />);

    expect(mockAutoBind).toHaveBeenCalledWith(true);
    expect(mockRiveProps.current?.dataBinding).toBe(mockDataBinding);
  });

  it('remounts the Rive view when the card variant changes', () => {
    const { rerender } = render(<MoneyCardFlipAnimation isMetalCard={false} />);

    rerender(<MoneyCardFlipAnimation isMetalCard />);

    expect(mockMountCount.current).toBe(2);
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

    act(() => mockOnErrorRef.current?.({ message: 'boom' }));

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

  describe('shouldPlay', () => {
    it('reserves the space without mounting Rive while held', () => {
      const { getByTestId, queryByTestId } = render(
        <MoneyCardFlipAnimation isMetalCard={false} shouldPlay={false} />,
      );

      // The reserved size must match the played state, or releasing the hold
      // shifts the sheet's contents.
      expect(getByTestId(MoneyCardFlipAnimationTestIds.CONTAINER)).toHaveStyle({
        width: 150,
        aspectRatio: 620 / 400,
      });
      expect(queryByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeNull();
      expect(
        queryByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
      ).toBeNull();
    });

    it('mounts Rive once the hold is released', () => {
      const { getByTestId, rerender } = render(
        <MoneyCardFlipAnimation isMetalCard={false} shouldPlay={false} />,
      );

      rerender(<MoneyCardFlipAnimation isMetalCard={false} shouldPlay />);

      expect(getByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeOnTheScreen();
    });

    it('plays without a hold by default', () => {
      const { getByTestId } = render(
        <MoneyCardFlipAnimation isMetalCard={false} />,
      );

      expect(getByTestId(MoneyCardFlipAnimationTestIds.RIVE)).toBeOnTheScreen();
    });

    it('shows the static image regardless of the hold when animations are off', () => {
      mockUseReduceMotionState.mockReturnValue(true);

      const { getByTestId } = render(
        <MoneyCardFlipAnimation isMetalCard={false} shouldPlay={false} />,
      );

      expect(
        getByTestId(MoneyCardFlipAnimationTestIds.STATIC_IMAGE),
      ).toBeOnTheScreen();
    });
  });

  describe('entry reveal', () => {
    const fireOnPlay = () => act(() => mockOnPlayRef.current?.());

    it('fires the authored reveal trigger once the Rive view starts playing', () => {
      render(<MoneyCardFlipAnimation isMetalCard={false} />);

      fireOnPlay();

      expect(mockTrigger).toHaveBeenCalledWith('startAnimation');
    });

    it('fires the reveal only once when the Rive view reports playing again', () => {
      render(<MoneyCardFlipAnimation isMetalCard={false} />);

      fireOnPlay();
      fireOnPlay();

      expect(mockTrigger).toHaveBeenCalledTimes(1);
    });

    it('does not dispatch to a detached native view', () => {
      mockViewTag.mockReturnValue(null);

      render(<MoneyCardFlipAnimation isMetalCard={false} />);

      fireOnPlay();

      expect(mockTrigger).not.toHaveBeenCalled();
    });

    describe('before the native view reports playing', () => {
      beforeEach(() => {
        jest.useFakeTimers();
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      const advancePastFallback = () =>
        act(() => {
          jest.advanceTimersByTime(RIVE_REVEAL_FALLBACK_DELAY_MS);
        });

      it('fires the reveal from the fallback timer', () => {
        render(<MoneyCardFlipAnimation isMetalCard={false} />);

        advancePastFallback();

        expect(mockTrigger).toHaveBeenCalledWith('startAnimation');
      });

      it('fires the reveal again once a slow-loading view reports playing', () => {
        // The trigger is the flip's only motion, and the fallback's attempt is
        // dropped silently when the file has not loaded yet.
        render(<MoneyCardFlipAnimation isMetalCard={false} />);

        advancePastFallback();
        fireOnPlay();

        expect(mockTrigger).toHaveBeenCalledTimes(2);
      });

      it('does not fire the reveal while the flip is held', () => {
        render(
          <MoneyCardFlipAnimation isMetalCard={false} shouldPlay={false} />,
        );

        advancePastFallback();

        expect(mockTrigger).not.toHaveBeenCalled();
      });

      it('does not fire the reveal while the card variant is unknown', () => {
        render(<MoneyCardFlipAnimation />);

        advancePastFallback();

        expect(mockTrigger).not.toHaveBeenCalled();
      });

      it('does not fire the reveal when the feature flag is off', () => {
        mockUseSelector.mockReturnValue(false);

        render(<MoneyCardFlipAnimation isMetalCard={false} />);

        advancePastFallback();

        expect(mockTrigger).not.toHaveBeenCalled();
      });

      it('does not fire the reveal under reduce motion', () => {
        mockUseReduceMotionState.mockReturnValue(true);

        render(<MoneyCardFlipAnimation isMetalCard={false} />);

        advancePastFallback();

        expect(mockTrigger).not.toHaveBeenCalled();
      });
    });
  });
});
