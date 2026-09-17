import React from 'react';
import { render } from '@testing-library/react-native';
import { View } from 'react-native';
import type { ReactTestRendererJSON } from 'react-test-renderer';
import { Slider } from '@metamask/design-system-react-native';
import PerpsSlider from './PerpsSlider';
import { playImpact, ImpactMoment } from '../../../../../util/haptics';

jest.mock('@metamask/design-system-react-native', () => ({
  Slider: jest.fn(() => null),
}));

jest.mock('../../../../../util/haptics', () => ({
  playImpact: jest.fn(),
  ImpactMoment: {
    SliderGrip: 'slider-grip',
    SliderTick: 'slider-tick',
  },
}));

const MockedSlider = jest.mocked(Slider);

describe('PerpsSlider', () => {
  const defaultProps = {
    value: 50,
    onValueChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const getSliderProps = () =>
    MockedSlider.mock.calls[MockedSlider.mock.calls.length - 1][0];

  /** `step` is optional on the Slider's props but PerpsSlider always sets it. */
  const getSliderStep = () => {
    const { step } = getSliderProps();
    if (step === undefined) {
      throw new Error('PerpsSlider must always pass step');
    }
    return step;
  };

  it('renders the design-system Slider in the percent domain', () => {
    render(<PerpsSlider {...defaultProps} />);

    // The default caller range is 0..100, so the percent value coincides with
    // the caller value here; the range props are always the percent domain.
    expect(getSliderProps()).toMatchObject({
      value: 50,
      minimumValue: 0,
      maximumValue: 100,
      isDisabled: false,
    });
  });

  it('converts a custom caller range into the percent domain', () => {
    render(
      <PerpsSlider
        {...defaultProps}
        minimumValue={10}
        maximumValue={200}
        step={5}
      />,
    );

    // The caller's range and step stay on this side of the boundary; the
    // design system Slider always sees 0..100 so that a range change moves the
    // `value` prop its thumb reaction watches.
    expect(getSliderProps()).toMatchObject({
      minimumValue: 0,
      maximumValue: 100,
    });
    // 50 in a 10..200 range is (50-10)/190 = ~21.05%.
    expect(getSliderProps().value).toBeCloseTo(21.05, 1);
  });

  it('maps disabled to isDisabled', () => {
    render(<PerpsSlider {...defaultProps} disabled />);

    expect(getSliderProps().isDisabled).toBe(true);
  });

  it('defaults showRangeLabels/showRangeDots to true when omitted', () => {
    render(<PerpsSlider {...defaultProps} />);

    expect(getSliderProps()).toMatchObject({
      showRangeLabels: true,
      showRangeDots: true,
    });
  });

  it('maps showPercentageLabels={false} to showRangeLabels being false without affecting showRangeDots', () => {
    render(<PerpsSlider {...defaultProps} showPercentageLabels={false} />);

    expect(getSliderProps()).toMatchObject({
      showRangeLabels: false,
      showRangeDots: true,
    });
  });

  it('maps showPercentageMarkers={false} to showRangeDots being false without affecting showRangeLabels', () => {
    render(<PerpsSlider {...defaultProps} showPercentageMarkers={false} />);

    expect(getSliderProps()).toMatchObject({
      showRangeLabels: true,
      showRangeDots: false,
    });
  });

  it('supports hiding both labels and dots independently', () => {
    render(
      <PerpsSlider
        {...defaultProps}
        showPercentageLabels={false}
        showPercentageMarkers={false}
      />,
    );

    expect(getSliderProps()).toMatchObject({
      showRangeLabels: false,
      showRangeDots: false,
    });
  });

  it('forwards onValueChange as-is', () => {
    const onValueChange = jest.fn();
    render(<PerpsSlider {...defaultProps} onValueChange={onValueChange} />);

    getSliderProps().onValueChange(75);

    expect(onValueChange).toHaveBeenCalledWith(75);
  });

  it('forwards onDragEnd when provided', () => {
    const onDragEnd = jest.fn();
    render(<PerpsSlider {...defaultProps} onDragEnd={onDragEnd} />);

    getSliderProps().onDragEnd?.(90);

    expect(onDragEnd).toHaveBeenCalledWith(90);
  });

  it('leaves onDragEnd undefined when not provided', () => {
    render(<PerpsSlider {...defaultProps} />);

    expect(getSliderProps().onDragEnd).toBeUndefined();
  });

  it('plays grip haptic feedback via onGrip', () => {
    render(<PerpsSlider {...defaultProps} />);

    getSliderProps().onGrip?.();

    expect(playImpact).toHaveBeenCalledWith(ImpactMoment.SliderGrip);
  });

  it('plays tick haptic feedback via onMark', () => {
    render(<PerpsSlider {...defaultProps} />);

    getSliderProps().onMark?.();

    expect(playImpact).toHaveBeenCalledWith(ImpactMoment.SliderTick);
  });

  describe('variant', () => {
    it('defaults to the default variant (no track inset override)', () => {
      render(<PerpsSlider {...defaultProps} />);

      expect(getSliderProps()).toMatchObject({
        trackInset: undefined,
      });
    });

    it('removes the track inset for the compact variant', () => {
      render(<PerpsSlider {...defaultProps} variant="compact" />);

      expect(getSliderProps()).toMatchObject({
        trackInset: 0,
      });
    });

    it('wraps the compact variant in a single double-width, scaled-down container so the track still spans the full row', () => {
      const { toJSON } = render(
        <PerpsSlider {...defaultProps} variant="compact" />,
      );

      const wrapper = toJSON() as ReactTestRendererJSON;
      // A single View declares the post-scale height/width; the Slider child
      // renders at its natural (pre-scale) size and overflows it by exactly
      // 2x, which `transform: scale(0.5)` (anchored top-left) shrinks back
      // down to precisely fit — no separate clipping container needed.
      expect(wrapper.props.style).toMatchObject({
        height: 17.5,
        width: '200%',
        transform: [{ scale: 0.5 }],
        transformOrigin: 'left top',
      });
    });

    it('does not wrap the default variant in a scaling container', () => {
      const { toJSON } = render(<PerpsSlider {...defaultProps} />);

      // The mocked Slider renders null, so an unwrapped render produces no tree.
      expect(toJSON()).toBeNull();
    });
  });

  describe('range changes', () => {
    // A range change must move the thumb without remounting: the range streams
    // from live feeds, and a remount would kill an in-flight drag.

    /** Records one entry per mount, so a remount is distinguishable from an update. */
    const renderWithMountTracking = () => {
      const mounts: number[] = [];
      let latestPercent: number | undefined;
      const trackMount = (instance: unknown) => {
        if (instance) {
          mounts.push(latestPercent ?? NaN);
        }
      };

      MockedSlider.mockImplementation((({ value }: { value?: number }) => {
        latestPercent = value;
        return <View ref={trackMount} />;
      }) as unknown as typeof Slider);

      return mounts;
    };

    it('repositions the thumb when the maximum collapses, without remounting', () => {
      const mounts = renderWithMountTracking();

      const { rerender } = render(
        <PerpsSlider {...defaultProps} value={10} maximumValue={1866} />,
      );
      rerender(<PerpsSlider {...defaultProps} value={10} maximumValue={34} />);

      // $10 is ~0.5% of a $1866 range but ~29.4% of a $34 one.
      expect(getSliderProps().value).toBeCloseTo(29.41, 1);
      // Exactly one mount: a remount here would reset sliderWidth/translateX
      // and rebuild the pan gesture, interrupting any drag in progress.
      expect(mounts).toHaveLength(1);
    });

    it('repositions the thumb when the minimum changes, without remounting', () => {
      const mounts = renderWithMountTracking();

      const { rerender } = render(
        <PerpsSlider
          {...defaultProps}
          value={50}
          minimumValue={0}
          maximumValue={100}
        />,
      );
      rerender(
        <PerpsSlider
          {...defaultProps}
          value={50}
          minimumValue={25}
          maximumValue={100}
        />,
      );

      // 50 sits at 50% of 0..100 but at 33.3% of 25..100.
      expect(getSliderProps().value).toBeCloseTo(33.33, 1);
      expect(mounts).toHaveLength(1);
    });

    it('never remounts across a burst of streamed range updates', () => {
      const mounts = renderWithMountTracking();

      const { rerender } = render(
        <PerpsSlider {...defaultProps} value={10} maximumValue={1867} />,
      );
      // `maximumValue` is derived from live price and balance feeds. Measured
      // against the real sizing math, ten 5-cent balance moves at leverage 20
      // produce ten distinct maxima, so this is the realistic streaming case.
      for (let maximumValue = 1866; maximumValue > 1856; maximumValue -= 1) {
        rerender(
          <PerpsSlider
            {...defaultProps}
            value={10}
            maximumValue={maximumValue}
          />,
        );
      }

      // A drag spanning these ticks must survive all of them.
      expect(mounts).toHaveLength(1);
    });

    it('keeps the emitted domain value stable when only the range churns mid-drag', () => {
      const onValueChange = jest.fn();
      const { rerender } = render(
        <PerpsSlider
          {...defaultProps}
          onValueChange={onValueChange}
          value={10}
          maximumValue={1000}
        />,
      );

      // The user is holding the thumb at the halfway point; the slider reports
      // percent, and PerpsSlider converts back into the caller's domain.
      getSliderProps().onValueChange(50);
      expect(onValueChange).toHaveBeenLastCalledWith(500);

      // A feed tick changes the range underneath the drag.
      rerender(
        <PerpsSlider
          {...defaultProps}
          onValueChange={onValueChange}
          value={10}
          maximumValue={800}
        />,
      );

      // The same gesture position now maps to the new range rather than
      // replaying a stale domain value.
      getSliderProps().onValueChange(50);
      expect(onValueChange).toHaveBeenLastCalledWith(400);
    });
  });

  describe('accessibility stepping', () => {
    // VoiceOver increments by the slider's own step, so one step in percent
    // must still resolve to exactly one caller step.
    it.each([
      [34, 1],
      [1866, 1],
      [100, 5],
    ])(
      'resolves one design-system step to one caller step for range 0..%i step %i',
      (maximumValue, step) => {
        render(
          <PerpsSlider
            {...defaultProps}
            minimumValue={0}
            maximumValue={maximumValue}
            step={step}
          />,
        );

        const percentStep = getSliderStep();
        const { onValueChange } = getSliderProps();
        const midpoint = 50;
        onValueChange(midpoint);
        const before = defaultProps.onValueChange.mock.calls.at(-1)?.[0];
        onValueChange(midpoint + percentStep);
        const after = defaultProps.onValueChange.mock.calls.at(-1)?.[0];

        expect(after - before).toBeCloseTo(step, 6);
      },
    );

    it('falls back to a fine grid when the range is degenerate', () => {
      render(
        <PerpsSlider {...defaultProps} minimumValue={7} maximumValue={7} />,
      );

      // No caller grid to mirror; the step must still be finite and positive.
      expect(getSliderProps().step).toBeGreaterThan(0);
      expect(Number.isFinite(getSliderProps().step)).toBe(true);
    });
  });

  describe('percent domain bounds', () => {
    // `maximumValue` is a live float from price/balance feeds and is rarely a
    // whole multiple of `step`, so the last index lands past the end of the
    // track unless the percent is clamped.
    it.each([
      [34.7, 1],
      [33.5, 1],
      [11.88, 1],
      [22.9, 1],
      [143.61, 1],
    ])(
      'keeps the thumb within 0-100 for the fractional maximum %p step %i',
      (maximumValue, step) => {
        const { rerender } = render(
          <PerpsSlider
            {...defaultProps}
            value={0}
            minimumValue={0}
            maximumValue={maximumValue}
            step={step}
          />,
        );

        for (let index = 0; index <= 40; index += 1) {
          const value = (index / 40) * maximumValue;
          rerender(
            <PerpsSlider
              {...defaultProps}
              value={value}
              minimumValue={0}
              maximumValue={maximumValue}
              step={step}
            />,
          );

          const percent = getSliderProps().value;
          expect(percent).toBeGreaterThanOrEqual(0);
          expect(percent).toBeLessThanOrEqual(100);
        }
      },
    );

    it('clamps a value past the caller maximum to the end of the track', () => {
      render(
        <PerpsSlider
          {...defaultProps}
          value={1000}
          minimumValue={0}
          maximumValue={33.5}
          step={1}
        />,
      );

      expect(getSliderProps().value).toBeLessThanOrEqual(100);
    });
  });

  describe('echo suppression', () => {
    // The slider matches echoes against its own emits with ===, so the percent
    // fed back must equal the percent emitted, not merely round to it.
    it.each([
      [34, 1],
      [1866, 1],
      [19800, 1],
      [33.5, 1],
      [11.88, 1],
    ])(
      'feeds back the exact percent it emitted for range 0..%p step %i',
      (maximumValue, step) => {
        const onValueChange = jest.fn();
        const { rerender } = render(
          <PerpsSlider
            {...defaultProps}
            onValueChange={onValueChange}
            minimumValue={0}
            maximumValue={maximumValue}
            step={step}
          />,
        );

        const percentStep = getSliderStep();

        for (let index = 0; index * percentStep <= 100; index += 1) {
          const emitted = index * percentStep;
          getSliderProps().onValueChange(emitted);
          const committed = onValueChange.mock.calls.at(-1)?.[0];

          // The parent stores the domain value and re-renders with it; what
          // comes back must equal what the gesture emitted.
          rerender(
            <PerpsSlider
              {...defaultProps}
              onValueChange={onValueChange}
              value={committed}
              minimumValue={0}
              maximumValue={maximumValue}
              step={step}
            />,
          );

          // Strict equality on purpose: the slider matches echoes with ===,
          // so a near-miss of a few ULPs still defeats the guard.
          expect(getSliderProps().value).toBe(emitted);
        }
      },
    );
  });

  describe('domain conversion', () => {
    it('converts percent back into the caller domain on drag end', () => {
      const onDragEnd = jest.fn();
      render(
        <PerpsSlider
          {...defaultProps}
          onDragEnd={onDragEnd}
          minimumValue={0}
          maximumValue={34}
        />,
      );

      getSliderProps().onDragEnd?.(100);

      expect(onDragEnd).toHaveBeenCalledWith(34);
    });

    it('applies the caller step in the caller domain, not in percent', () => {
      const onValueChange = jest.fn();
      render(
        <PerpsSlider
          {...defaultProps}
          onValueChange={onValueChange}
          minimumValue={0}
          maximumValue={100}
          step={5}
        />,
      );

      // 33% of 0..100 is 33, which must snap to the nearest multiple of 5. The
      // slider's own step is expressed in percent now, so PerpsSlider owns this.
      getSliderProps().onValueChange(33);

      expect(onValueChange).toHaveBeenCalledWith(35);
    });

    it('clamps to the caller range and does not emit NaN for a zero-width range', () => {
      const onValueChange = jest.fn();
      render(
        <PerpsSlider
          {...defaultProps}
          onValueChange={onValueChange}
          minimumValue={7}
          maximumValue={7}
        />,
      );

      // A zero balance collapses the range to a point; the thumb pins to 0%.
      expect(getSliderProps().value).toBe(0);

      getSliderProps().onValueChange(75);

      expect(onValueChange).toHaveBeenCalledWith(7);
    });

    it('drives the design system Slider in a fixed 0-100 domain', () => {
      render(
        <PerpsSlider {...defaultProps} minimumValue={0} maximumValue={34} />,
      );

      // The percent domain is what keeps the range out of the thumb-position
      // computation, so pin it explicitly.
      expect(getSliderProps()).toMatchObject({
        minimumValue: 0,
        maximumValue: 100,
      });
    });
  });

  it('forwards testID and accessibilityLabel', () => {
    render(
      <PerpsSlider
        {...defaultProps}
        testID="perps-slider"
        accessibilityLabel="Order size percentage"
      />,
    );

    expect(getSliderProps()).toMatchObject({
      testID: 'perps-slider',
      accessibilityLabel: 'Order size percentage',
    });
  });
});
