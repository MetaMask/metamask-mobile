/* eslint-disable no-console */
import React from 'react';
import { QuickBuyPercentageSlider } from './QuickBuyPercentageSlider';
import { SliderStoryWrapper } from '../../../../../../UI/__storybook__/SliderStoryWrapper';

const QuickBuyPercentageSliderMeta = {
  title: 'Components / UI / Sliders / QuickBuyPercentageSlider',
  component: QuickBuyPercentageSlider,
};

export default QuickBuyPercentageSliderMeta;

export const Default = {
  render: () => (
    <SliderStoryWrapper
      initialValue={25}
      label="Quick buy percentage"
      showCommittedValue
    >
      {({ value, onValueChange, onDragEnd }) => (
        <QuickBuyPercentageSlider
          value={value}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
        />
      )}
    </SliderStoryWrapper>
  ),
};

export const Disabled = {
  render: () => (
    <SliderStoryWrapper initialValue={50} label="Disabled">
      {({ value, onValueChange }) => (
        <QuickBuyPercentageSlider
          value={value}
          onValueChange={onValueChange}
          disabled
        />
      )}
    </SliderStoryWrapper>
  ),
};

export const FullAmount = {
  render: () => (
    <SliderStoryWrapper initialValue={100} label="Full balance">
      {({ value, onValueChange, onDragEnd }) => (
        <QuickBuyPercentageSlider
          value={value}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
        />
      )}
    </SliderStoryWrapper>
  ),
};
