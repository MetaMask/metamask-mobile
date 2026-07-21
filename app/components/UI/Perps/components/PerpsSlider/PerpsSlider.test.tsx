import React from 'react';
import { render } from '@testing-library/react-native';
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

  it('defaults showRangeLabels/showRangeDots to true when showPercentageLabels is omitted', () => {
    render(<PerpsSlider {...defaultProps} />);

    expect(getSliderProps()).toMatchObject({
      showRangeLabels: true,
      showRangeDots: true,
    });
  });

  it('maps showPercentageLabels={false} to both showRangeLabels and showRangeDots being false', () => {
    render(<PerpsSlider {...defaultProps} showPercentageLabels={false} />);

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
});
