import React from 'react';
import { Image, StyleSheet } from 'react-native';
import {
  act,
  render,
  waitFor,
  type RenderResult,
} from '@testing-library/react-native';
import {
  Alignment,
  Fit,
  RiveErrorType,
  type RiveError,
} from '@rive-app/react-native';
import CardFreezeUnfreezeAnimation from './CardFreezeUnfreezeAnimation';
import { useReduceMotion } from '../../../Money/hooks/useReduceMotion';
import { __resetRiveMocks } from '../../../../../__mocks__/rive-app-react-native';
import cardFrontFullRes from '../../../../../images/card_freeze_card_front.png';

// The component queues the desired freeze/unfreeze state until the view model
// instance and the native view are both ready, so the local mock exposes
// knobs for each readiness gate: the file load, the view model instance, and
// the native view (awaitViewReady). RiveView props are captured so tests can
// assert the overlay geometry, the data binding, and drive `onError`.
const mockTrigger = jest.fn();
const mockSetFrozen = jest.fn();
const mockInitFrozen = jest.fn();
const mockPlayIfNeeded = jest.fn();
const mockAwaitViewReady = jest.fn(async () => undefined);
const mockRiveFile = { __mockRiveFile: true };
const mockViewModelInstance = {
  __mockViewModelInstance: true,
  booleanProperty: (path: string) => ({
    set: (value: boolean) => mockInitFrozen(path, value),
  }),
};
const mockUseRiveFile = jest.fn();
const mockLastRiveViewProps: {
  current?: {
    style?: { width: number; height: number };
    fit?: Fit;
    alignment?: Alignment;
    dataBind?: unknown;
    onError?: (error: RiveError) => void;
  };
} = {};
let mockRiveFileReady = true;
let mockInstanceReady = true;
let mockViewReady = true;
// useRive returns the same view object until the native view is recreated.
const createMockRiveViewRef = () => ({
  awaitViewReady: mockAwaitViewReady,
  playIfNeeded: mockPlayIfNeeded,
});
let mockRiveViewRef = createMockRiveViewRef();

jest.mock('@rive-app/react-native', () => {
  const actual = jest.requireActual(
    '../../../../../__mocks__/rive-app-react-native',
  );
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  const MockRiveView = (props: Record<string, unknown>) => {
    mockLastRiveViewProps.current = props;
    return ReactActual.createElement(View, { testID: 'mock-rive-view' });
  };

  return {
    ...actual,
    RiveView: MockRiveView,
    useRiveFile: (...args: unknown[]) =>
      mockUseRiveFile(...args) ?? {
        riveFile: mockRiveFileReady ? mockRiveFile : null,
        isLoading: false,
        error: null,
      },
    useRive: () => ({
      riveViewRef: mockViewReady ? mockRiveViewRef : null,
      setHybridRef: { f: jest.fn() },
    }),
    useViewModelInstance: (
      _file: unknown,
      params?: { onInit?: (instance: typeof mockViewModelInstance) => void },
    ) => {
      if (mockInstanceReady) {
        params?.onInit?.(mockViewModelInstance);
      }
      return {
        instance: mockInstanceReady ? mockViewModelInstance : null,
        isLoading: !mockInstanceReady,
        error: null,
      };
    },
    useRiveBoolean: (path: string) => ({
      value: undefined,
      setValue: (value: boolean) => mockSetFrozen(path, value),
      error: null,
    }),
    useRiveTrigger: (path: string) => ({
      trigger: () => mockTrigger(path),
      error: null,
    }),
  };
});

jest.mock('../../../Money/hooks/useReduceMotion', () => ({
  useReduceMotion: jest.fn(() => false),
}));

jest.mock(
  '../../../../../animations/card_freeze_unfreeze.riv',
  () => 'card_freeze_unfreeze.riv',
);

const mockUseReduceMotion = useReduceMotion as jest.Mock;

const FALLBACK_SOURCE = 123;

type TestElement = ReturnType<RenderResult['getByTestId']>;

const animationElement = (isFrozen: boolean) => (
  <CardFreezeUnfreezeAnimation
    isFrozen={isFrozen}
    fallbackSource={FALLBACK_SOURCE}
    width={300}
    testID="freeze-animation"
  />
);

const findRiveOverlayWrapper = (container: TestElement): TestElement | null =>
  container.findAll(
    (node: TestElement) => node.props.pointerEvents === 'none',
  )[0] ?? null;

describe('CardFreezeUnfreezeAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetRiveMocks();
    mockLastRiveViewProps.current = undefined;
    mockRiveFileReady = true;
    mockInstanceReady = true;
    mockViewReady = true;
    mockRiveViewRef = createMockRiveViewRef();
    mockUseRiveFile.mockReset();
    mockUseReduceMotion.mockReturnValue(false);
  });

  it('renders its container while the Rive file is unavailable', () => {
    mockRiveFileReady = false;

    const { getByTestId } = render(animationElement(false));

    expect(getByTestId('freeze-animation')).toBeOnTheScreen();
    expect(mockLastRiveViewProps.current).toBeUndefined();
  });

  it('shows the full-resolution static card until a frozen card Rive view is ready and laid out', async () => {
    mockViewReady = false;
    const { getByTestId, rerender } = render(animationElement(true));
    const container = getByTestId('freeze-animation');

    const fallbackImages = container.findAllByType(Image);
    expect(fallbackImages).toHaveLength(1);
    expect(fallbackImages[0].props.source).toBe(cardFrontFullRes);
    // The Rive view is mounted but held invisible so its first (un-sized)
    // frames never flash.
    expect(getByTestId('mock-rive-view')).toBeOnTheScreen();
    const hiddenWrapper = findRiveOverlayWrapper(container);
    expect(hiddenWrapper).not.toBeNull();
    expect(StyleSheet.flatten([hiddenWrapper?.props.style])?.opacity).toBe(0);

    mockViewReady = true;
    rerender(animationElement(true));

    await waitFor(() => {
      expect(container.findAllByType(Image)).toHaveLength(0);
    });
    const shownWrapper = findRiveOverlayWrapper(container);
    expect(
      StyleSheet.flatten([shownWrapper?.props.style])?.opacity,
    ).toBeUndefined();
  });

  it('waits for the view model instance before mounting the Rive view', () => {
    mockInstanceReady = false;

    const { queryByTestId } = render(animationElement(false));

    expect(queryByTestId('mock-rive-view')).not.toBeOnTheScreen();
  });

  it('holds a recovered Rive view hidden until it is laid out again', async () => {
    const { getByTestId, rerender } = render(animationElement(true));
    const container = getByTestId('freeze-animation');
    await waitFor(() => {
      expect(container.findAllByType(Image)).toHaveLength(0);
    });
    let resolveRecoveredView: () => void = () => undefined;
    mockAwaitViewReady.mockImplementationOnce(
      async () =>
        new Promise<undefined>((resolve) => {
          resolveRecoveredView = () => resolve(undefined);
        }),
    );

    mockViewReady = false;
    rerender(animationElement(true));
    mockRiveViewRef = createMockRiveViewRef();
    mockViewReady = true;
    rerender(animationElement(true));

    const recoveredWrapper = findRiveOverlayWrapper(container);
    expect(StyleSheet.flatten([recoveredWrapper?.props.style])?.opacity).toBe(
      0,
    );
    await act(async () => {
      resolveRecoveredView();
    });
    await waitFor(() => {
      expect(
        StyleSheet.flatten([findRiveOverlayWrapper(container)?.props.style])
          ?.opacity,
      ).toBeUndefined();
    });
  });

  it('keeps an unfrozen card on the static art until a trigger plays', async () => {
    const { getByTestId, rerender } = render(animationElement(false));
    const container = getByTestId('freeze-animation');
    // Let awaitViewReady and both layout frames run.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(container.findAllByType(Image)).toHaveLength(1);
    expect(
      StyleSheet.flatten([findRiveOverlayWrapper(container)?.props.style])
        ?.opacity,
    ).toBe(0);

    rerender(animationElement(true));

    await waitFor(() => {
      expect(container.findAllByType(Image)).toHaveLength(0);
    });
    expect(
      StyleSheet.flatten([findRiveOverlayWrapper(container)?.props.style])
        ?.opacity,
    ).toBeUndefined();
  });

  it.each([false, true])(
    'starts the view model frozen=%s to match the card',
    (isFrozen) => {
      render(animationElement(isFrozen));

      expect(mockInitFrozen).toHaveBeenLastCalledWith('frozen', isFrozen);
    },
  );

  it('keeps the view model frozen value in step with the card', () => {
    const { rerender } = render(animationElement(false));
    expect(mockSetFrozen).toHaveBeenLastCalledWith('frozen', false);

    rerender(animationElement(true));

    expect(mockSetFrozen).toHaveBeenLastCalledWith('frozen', true);
  });

  it('fires the freeze trigger on mount for a card that loads frozen', () => {
    render(animationElement(true));

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith('freeze');
    expect(mockPlayIfNeeded).toHaveBeenCalledTimes(1);
  });

  it('does not fire a trigger on mount for an unfrozen card', () => {
    render(animationElement(false));

    expect(mockTrigger).not.toHaveBeenCalled();
    expect(mockPlayIfNeeded).not.toHaveBeenCalled();
  });

  it('fires the unfreeze trigger when the card changes from frozen to unfrozen', () => {
    const { rerender } = render(animationElement(true));

    rerender(animationElement(false));

    expect(mockTrigger).toHaveBeenCalledTimes(2);
    expect(mockTrigger).toHaveBeenNthCalledWith(1, 'freeze');
    expect(mockTrigger).toHaveBeenNthCalledWith(2, 'unfreeze');
    // The state machine stops advancing once the freeze settles, so each
    // trigger is followed by playIfNeeded to draw the next one.
    expect(mockPlayIfNeeded).toHaveBeenCalledTimes(2);
  });

  it('waits for the view model instance before firing a mount-time freeze', async () => {
    mockInstanceReady = false;
    const { rerender } = render(animationElement(true));

    expect(mockTrigger).not.toHaveBeenCalled();

    mockInstanceReady = true;
    rerender(animationElement(true));

    await waitFor(() => {
      expect(mockTrigger).toHaveBeenCalledWith('freeze');
    });
  });

  it('waits for the Rive view before firing a mount-time freeze', async () => {
    mockViewReady = false;
    const { rerender } = render(animationElement(true));

    expect(mockTrigger).not.toHaveBeenCalled();

    mockViewReady = true;
    rerender(animationElement(true));

    await waitFor(() => {
      expect(mockTrigger).toHaveBeenCalledTimes(1);
    });
    expect(mockTrigger).toHaveBeenCalledWith('freeze');
  });

  it('renders only the static fallback under reduce motion', () => {
    mockUseReduceMotion.mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(animationElement(false));

    expect(queryByTestId('mock-rive-view')).toBeNull();
    const fallbackImage =
      getByTestId('freeze-animation').findAllByType(Image)[0];
    expect(fallbackImage.props.source).toBe(FALLBACK_SOURCE);
    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('dims the static fallback for a frozen card under reduce motion', () => {
    mockUseReduceMotion.mockReturnValue(true);

    const { getByTestId } = render(animationElement(true));

    const fallbackImage =
      getByTestId('freeze-animation').findAllByType(Image)[0];
    expect(StyleSheet.flatten(fallbackImage.props.style).opacity).toBe(0.5);
  });

  it('does not play the melt when the Rive view recovers on an unfrozen card', () => {
    const { rerender } = render(animationElement(false));

    mockViewReady = false;
    rerender(animationElement(false));
    mockViewReady = true;
    rerender(animationElement(false));

    expect(mockTrigger).not.toHaveBeenCalled();
  });

  it('re-applies the freeze when the Rive view recovers on a frozen card', () => {
    const { rerender } = render(animationElement(true));
    mockTrigger.mockClear();

    mockViewReady = false;
    rerender(animationElement(true));
    mockViewReady = true;
    rerender(animationElement(true));

    expect(mockTrigger).toHaveBeenCalledTimes(1);
    expect(mockTrigger).toHaveBeenCalledWith('freeze');
  });

  it('falls back to the static card when the Rive view reports an error', () => {
    const { getByTestId, queryByTestId } = render(animationElement(true));

    expect(mockTrigger).toHaveBeenCalledWith('freeze');

    act(() => {
      mockLastRiveViewProps.current?.onError?.({
        message: 'bad artboard',
        type: RiveErrorType.IncorrectArtboardName,
      });
    });

    expect(queryByTestId('mock-rive-view')).toBeNull();
    const fallbackImage =
      getByTestId('freeze-animation').findAllByType(Image)[0];
    expect(fallbackImage.props.source).toBe(FALLBACK_SOURCE);
  });

  it('sizes the artboard so its card face spans the card width, centred on it', () => {
    const { getByTestId } = render(animationElement(false));

    const props = mockLastRiveViewProps.current;
    expect(props).toBeDefined();
    // The whole 1192×754 artboard is rendered at width × 1192/851 with
    // Fit.Contain so its 851-wide card face lands exactly on the static card.
    const riveWidth = (300 * 1192) / 851;
    expect(props?.style?.width).toBeCloseTo(riveWidth, 6);
    expect(props?.style?.height).toBeCloseTo((riveWidth * 754) / 1192, 6);
    expect(props?.fit).toBe(Fit.Contain);
    expect(props?.alignment).toBe(Alignment.Center);
    expect(props?.dataBind).toBe(mockViewModelInstance);

    const cardHeight = (300 * 540) / 851;
    const wrapper = findRiveOverlayWrapper(getByTestId('freeze-animation'));
    const wrapperStyle = StyleSheet.flatten([wrapper?.props.style]);
    expect(wrapperStyle?.left).toBeCloseTo((300 - riveWidth) / 2, 6);
    expect(wrapperStyle?.top).toBeCloseTo(
      (cardHeight - (riveWidth * 754) / 1192) / 2,
      6,
    );
  });

  it('passes the same Rive file options on every render', () => {
    const { rerender } = render(animationElement(false));
    rerender(animationElement(true));

    const [first, second] = mockUseRiveFile.mock.calls;
    expect(second[1]).toBe(first[1]);
  });

  it('feeds the .riv file the full-resolution card face out-of-band', () => {
    render(animationElement(false));

    expect(mockUseRiveFile).toHaveBeenCalledWith('card_freeze_unfreeze.riv', {
      referencedAssets: {
        'DigitalCard-NewBrand': { source: cardFrontFullRes },
      },
    });
  });
});
