import { renderHook, act } from '@testing-library/react-native';
import type { RiveFile } from '@rive-app/react-native';
import { useRiveParallaxTilt } from './useRiveParallaxTilt';
import { useDeviceOrientation } from './useDeviceOrientation';
import { RIVE_TILT_WRITE_EPSILON } from '../utils/parallax';

const mockSetNumber = jest.fn();
const mockNumberProperty = jest.fn((path: string) => ({
  set: (value: number) => mockSetNumber(path, value),
}));
let mockInstance: { numberProperty: typeof mockNumberProperty } | null = null;
const mockUseViewModelInstance = jest.fn(() => ({
  instance: mockInstance,
  isLoading: !mockInstance,
  error: null,
}));

jest.mock('@rive-app/react-native', () => ({
  useViewModelInstance: (...args: unknown[]) =>
    mockUseViewModelInstance(...(args as [])),
}));

jest.mock('./useDeviceOrientation', () => ({
  useDeviceOrientation: jest.fn(),
}));

const mockUseDeviceOrientation = useDeviceOrientation as jest.Mock;

const mockRiveFile = {} as RiveFile;

const identityShape = (x: number, y: number) => ({ x, y });

/** Converts a delta in the artboard's own 0-100 units into tilt units. */
const asTilt = (riveDelta: number) => riveDelta / 50;

const latestApplyTilt = (): ((x: number, y: number, hz: number) => void) =>
  mockUseDeviceOrientation.mock.calls[
    mockUseDeviceOrientation.mock.calls.length - 1
  ][0];

const writesTo = (property: string): number[] =>
  mockSetNumber.mock.calls
    .filter(([name]) => name === property)
    .map(([, value]) => value);

const setUp = ({
  enabled = true,
  shapeTilt = identityShape,
}: {
  enabled?: boolean;
  shapeTilt?: (x: number, y: number, hz: number) => { x: number; y: number };
} = {}) =>
  renderHook(
    (props: { enabled: boolean }) =>
      useRiveParallaxTilt(mockRiveFile, {
        artboardName: 'Artboard A',
        enabled: props.enabled,
        shapeTilt,
      }),
    { initialProps: { enabled } },
  );

describe('useRiveParallaxTilt', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInstance = { numberProperty: mockNumberProperty };
    mockNumberProperty.mockImplementation((path: string) => ({
      set: (value: number) => mockSetNumber(path, value),
    }));
  });

  it('binds the view model of the given artboard asynchronously', () => {
    setUp();

    expect(mockUseViewModelInstance).toHaveBeenCalledWith(mockRiveFile, {
      artboardName: 'Artboard A',
      async: true,
    });
  });

  it('returns the bound view-model instance', () => {
    const { result } = setUp();

    expect(result.current).toBe(mockInstance);
  });

  it('passes the enabled flag through to the device orientation hook', () => {
    setUp({ enabled: false });

    expect(mockUseDeviceOrientation).toHaveBeenCalledWith(
      expect.any(Function),
      { enabled: false },
    );
  });

  it('drives the bound Rive number properties from mapped tilt values', () => {
    setUp();

    act(() => latestApplyTilt()(0.5, 0.5, 60));

    expect(mockSetNumber).toHaveBeenCalledWith('xValue', 75);
    expect(mockSetNumber).toHaveBeenCalledWith('yValue', 25);
  });

  it('shapes the tilt before mapping it to Rive units', () => {
    const shapeTilt = jest.fn((x: number, y: number) => ({
      x: x / 2,
      y: y / 2,
    }));
    setUp({ shapeTilt });

    act(() => latestApplyTilt()(1, -1, 30));

    expect(shapeTilt).toHaveBeenCalledWith(1, -1, 30);
    expect(mockSetNumber).toHaveBeenCalledWith('xValue', 75);
    expect(mockSetNumber).toHaveBeenCalledWith('yValue', 75);
  });

  it('does not dispatch tilt values before the view-model instance is ready', () => {
    mockInstance = null;
    setUp();

    act(() => latestApplyTilt()(0.5, -0.5, 60));

    expect(mockSetNumber).not.toHaveBeenCalled();
  });

  it('does not dispatch tilt values when the artboard has no parallax properties', () => {
    mockNumberProperty.mockReturnValue(
      undefined as unknown as ReturnType<typeof mockNumberProperty>,
    );
    setUp();

    act(() => latestApplyTilt()(0.5, -0.5, 60));

    expect(mockSetNumber).not.toHaveBeenCalled();
  });

  it('does not write again for an unchanged reading', () => {
    setUp();
    act(() => latestApplyTilt()(0.2, 0.2, 60));
    mockSetNumber.mockClear();

    act(() => {
      for (let i = 0; i < 50; i++) latestApplyTilt()(0.2, 0.2, 60);
    });

    expect(mockSetNumber).not.toHaveBeenCalled();
  });

  it('does not write a change too small to be seen', () => {
    setUp();
    act(() => latestApplyTilt()(0.2, 0.2, 60));
    mockSetNumber.mockClear();

    act(() =>
      latestApplyTilt()(0.2 + asTilt(RIVE_TILT_WRITE_EPSILON / 2), 0.2, 60),
    );

    expect(mockSetNumber).not.toHaveBeenCalled();
  });

  it('writes a change past the visible threshold', () => {
    setUp();
    act(() => latestApplyTilt()(0.2, 0.2, 60));
    mockSetNumber.mockClear();

    act(() =>
      latestApplyTilt()(0.2 + asTilt(RIVE_TILT_WRITE_EPSILON * 2), 0.2, 60),
    );

    const writes = writesTo('xValue');
    expect(writes).toHaveLength(1);
    expect(writes[0]).toBeCloseTo(60 + RIVE_TILT_WRITE_EPSILON * 2);
  });

  it('writes only the axis that moved', () => {
    setUp();
    act(() => latestApplyTilt()(0.2, 0.2, 60));
    mockSetNumber.mockClear();

    act(() => latestApplyTilt()(0.6, 0.2, 60));

    expect(writesTo('xValue')).toEqual([80]);
    expect(writesTo('yValue')).toEqual([]);
  });

  it('accumulates sub-threshold drift rather than discarding it', () => {
    setUp();
    act(() => latestApplyTilt()(0.2, 0.2, 60));
    mockSetNumber.mockClear();

    // Each step alone is below the threshold; together they cross it.
    const step = asTilt(RIVE_TILT_WRITE_EPSILON * 0.6);
    act(() => latestApplyTilt()(0.2 + step, 0.2, 60));
    act(() => latestApplyTilt()(0.2 + step * 2, 0.2, 60));

    const writes = writesTo('xValue');
    expect(writes).toHaveLength(1);
    expect(writes[0]).toBeCloseTo(60 + RIVE_TILT_WRITE_EPSILON * 1.2);
  });

  it('writes again after the animation is re-enabled', () => {
    const { rerender } = setUp();
    act(() => latestApplyTilt()(0.2, 0.2, 60));
    mockSetNumber.mockClear();

    rerender({ enabled: false });
    rerender({ enabled: true });
    act(() => latestApplyTilt()(0.2, 0.2, 60));

    const xWrites = writesTo('xValue');
    const yWrites = writesTo('yValue');
    expect(xWrites).toHaveLength(1);
    expect(xWrites[0]).toBeCloseTo(60);
    expect(yWrites).toHaveLength(1);
    expect(yWrites[0]).toBeCloseTo(40);
  });

  it('writes again after the view-model instance is replaced', () => {
    const { rerender } = setUp();
    act(() => latestApplyTilt()(0.2, 0.2, 60));
    mockSetNumber.mockClear();

    // A new artboard binds a new instance; the fresh view starts at rest.
    mockInstance = { numberProperty: mockNumberProperty };
    rerender({ enabled: true });
    act(() => latestApplyTilt()(0.2, 0.2, 60));

    const xWrites = writesTo('xValue');
    const yWrites = writesTo('yValue');
    expect(xWrites).toHaveLength(1);
    expect(xWrites[0]).toBeCloseTo(60);
    expect(yWrites).toHaveLength(1);
    expect(yWrites[0]).toBeCloseTo(40);
  });
});
