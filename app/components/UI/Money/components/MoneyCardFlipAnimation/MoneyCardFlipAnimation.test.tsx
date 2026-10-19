import React from 'react';
import { render, act } from '@testing-library/react-native';
import { RiveErrorType, type RiveError } from '@rive-app/react-native';
import MoneyCardFlipAnimation from './MoneyCardFlipAnimation';
import { MoneyCardFlipAnimationTestIds } from './MoneyCardFlipAnimation.testIds';
import { useReduceMotionState } from '../../hooks/useReduceMotion';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';
import mmCardRegular from '../../../../../images/mm_card_regular.png';
import mmCardMetal from '../../../../../images/mm_card_metal.png';

// The component drives the entrance through the artboard's state machine by
// firing a data-bound `startAnimation` trigger via `instance.triggerProperty()`
// (see `useRiveRevealTrigger`), so the local mock provides a view-model
// instance whose `triggerProperty(...).trigger()` records into
// `mockTrigger(path)`. `useRive` is overridden so tests can flip the native
// view's readiness (`mockViewReady`), which gates the reveal. The RiveView
// wrapper additionally captures props (artboardName/stateMachineName/dataBind/
// onError) and counts mounts for the remount-per-variant contract.
const mockTrigger = jest.fn();
const mockTriggerProperty = jest.fn((path: string) => ({
  trigger: () => mockTrigger(path),
}));
const mockPlayIfNeeded = jest.fn();
const mockInstance = { triggerProperty: mockTriggerProperty };
let mockInstanceReady = true;
let mockViewReady = true;
const mockRiveViewProps: {
  current?: {
    testID?: string;
    artboardName?: string;
    stateMachineName?: string;
    dataBind?: unknown;
    autoPlay?: boolean;
    onError?: (error: RiveError) => void;
  };
} = {};
const mockMountCount = { current: 0 };

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual('@rive-app/react-native');
  const ReactActual = jest.requireActual('react');
  const MockRiveView = (props: {
    testID?: string;
    artboardName?: string;
    stateMachineName?: string;
    dataBind?: unknown;
    autoPlay?: boolean;
    onError?: (error: RiveError) => void;
  }) => {
    ReactActual.useEffect(() => {
      mockMountCount.current += 1;
    }, []);
    // Captured in a per-render effect (not during render) to keep the
    // react-compiler happy about external writes.
    ReactActual.useEffect(() => {
      mockRiveViewProps.current = props;
    });
    return ReactActual.createElement(actual.RiveView, props);
  };
  return {
    __esModule: true,
    ...actual,
    useViewModelInstance: () => ({
      instance: mockInstanceReady ? mockInstance : null,
      isLoading: !mockInstanceReady,
      error: null,
    }),
    useRive: () => ({
      riveRef: { current: null },
      riveViewRef: mockViewReady ? { playIfNeeded: mockPlayIfNeeded } : null,
      setHybridRef: { f: jest.fn() },
    }),
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
    mockMountCount.current = 0;
    mockInstanceReady = true;
    mockViewReady = true;
    mockTriggerProperty.mockImplementation((path: string) => ({
      trigger: () => mockTrigger(path),
    }));
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

    expect(mockRiveViewProps.current?.artboardName).toBe('CardTiltMetal');
  });

  it('renders the digital artboard for a virtual card', () => {
    render(<MoneyCardFlipAnimation isMetalCard={false} />);

    expect(mockRiveViewProps.current?.artboardName).toBe('CardTiltDigital');
  });

  it('drives the entrance through the state machine', () => {
    render(<MoneyCardFlipAnimation isMetalCard={false} />);

    expect(mockRiveViewProps.current?.stateMachineName).toBe('State Machine 1');
    expect(mockRiveViewProps.current?.autoPlay).toBe(true);
  });

  it('binds the artboard view model so the reveal trigger resolves', () => {
    render(<MoneyCardFlipAnimation isMetalCard={false} />);

    expect(mockRiveViewProps.current?.dataBind).toBe(mockInstance);
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
    it('fires the authored reveal trigger once the native view is ready', () => {
      render(<MoneyCardFlipAnimation isMetalCard={false} />);

      expect(mockTrigger).toHaveBeenCalledWith('startAnimation');
      expect(mockTrigger).toHaveBeenCalledTimes(1);
    });

    it('wakes the state machine after firing the reveal', () => {
      render(<MoneyCardFlipAnimation isMetalCard={false} />);

      expect(mockPlayIfNeeded).toHaveBeenCalled();
    });

    it('fires the reveal only once across re-renders', () => {
      const { rerender } = render(
        <MoneyCardFlipAnimation isMetalCard={false} />,
      );

      rerender(<MoneyCardFlipAnimation isMetalCard={false} />);

      expect(mockTrigger).toHaveBeenCalledTimes(1);
    });

    it('defers the reveal until the native view becomes ready', () => {
      mockViewReady = false;
      const { rerender } = render(
        <MoneyCardFlipAnimation isMetalCard={false} />,
      );

      expect(mockTrigger).not.toHaveBeenCalled();

      mockViewReady = true;
      rerender(<MoneyCardFlipAnimation isMetalCard={false} />);

      expect(mockTrigger).toHaveBeenCalledWith('startAnimation');
    });

    it('does not fire the reveal before the view-model instance is ready', () => {
      mockInstanceReady = false;

      render(<MoneyCardFlipAnimation isMetalCard={false} />);

      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('does not fire the reveal while the flip is held', () => {
      render(<MoneyCardFlipAnimation isMetalCard={false} shouldPlay={false} />);

      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('does not fire the reveal while the card variant is unknown', () => {
      render(<MoneyCardFlipAnimation />);

      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('does not fire the reveal when the feature flag is off', () => {
      mockUseSelector.mockReturnValue(false);

      render(<MoneyCardFlipAnimation isMetalCard={false} />);

      expect(mockTrigger).not.toHaveBeenCalled();
    });

    it('does not fire the reveal under reduce motion', () => {
      mockUseReduceMotionState.mockReturnValue(true);

      render(<MoneyCardFlipAnimation isMetalCard={false} />);

      expect(mockTrigger).not.toHaveBeenCalled();
    });
  });
});
