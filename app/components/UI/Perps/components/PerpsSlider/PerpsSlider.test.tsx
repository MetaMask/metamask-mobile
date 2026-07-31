import React from 'react';
import { render } from '@testing-library/react-native';
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

  it('renders the design-system Slider with default range/step values', () => {
    render(<PerpsSlider {...defaultProps} />);

    expect(getSliderProps()).toMatchObject({
      value: 50,
      minimumValue: 0,
      maximumValue: 100,
      step: 1,
      isDisabled: false,
    });
  });

  it('forwards custom minimumValue, maximumValue, and step', () => {
    render(
      <PerpsSlider
        {...defaultProps}
        minimumValue={10}
        maximumValue={200}
        step={5}
      />,
    );

    expect(getSliderProps()).toMatchObject({
      minimumValue: 10,
      maximumValue: 200,
      step: 5,
    });
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
