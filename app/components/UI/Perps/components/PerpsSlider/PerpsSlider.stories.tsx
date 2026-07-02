/* eslint-disable no-console */
import React from 'react';
import PerpsSlider from './PerpsSlider';
import { SliderStoryWrapper } from '../../../__storybook__/SliderStoryWrapper';

const PerpsSliderMeta = {
  title: 'Components / UI / Sliders / PerpsSlider',
  component: PerpsSlider,
};

export default PerpsSliderMeta;

export const Default = {
  render: () => (
    <SliderStoryWrapper initialValue={25} label="Position size">
      {({ value, onValueChange }) => (
        <PerpsSlider value={value} onValueChange={onValueChange} />
      )}
    </SliderStoryWrapper>
  ),
};

export const GradientProgress = {
  render: () => (
    <SliderStoryWrapper initialValue={60} label="Gradient track">
      {({ value, onValueChange }) => (
        <PerpsSlider
          value={value}
          onValueChange={onValueChange}
          progressColor="gradient"
        />
      )}
    </SliderStoryWrapper>
  ),
};

export const WithQuickValues = {
  render: () => (
    <SliderStoryWrapper initialValue={10} label="Leverage quick values">
      {({ value, onValueChange }) => (
        <PerpsSlider
          value={value}
          onValueChange={onValueChange}
          minimumValue={1}
          maximumValue={50}
          quickValues={[5, 10, 25]}
          showPercentageLabels={false}
        />
      )}
    </SliderStoryWrapper>
  ),
};

export const Disabled = {
  render: () => (
    <SliderStoryWrapper initialValue={40} label="Disabled">
      {({ value, onValueChange }) => (
        <PerpsSlider value={value} onValueChange={onValueChange} disabled />
      )}
    </SliderStoryWrapper>
  ),
};

export const WithoutLabels = {
  render: () => (
    <SliderStoryWrapper initialValue={75} label="No percentage labels">
      {({ value, onValueChange }) => (
        <PerpsSlider
          value={value}
          onValueChange={onValueChange}
          showPercentageLabels={false}
        />
      )}
    </SliderStoryWrapper>
  ),
};
