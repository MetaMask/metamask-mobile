/* eslint-disable no-console */
import React from 'react';
import { BatchSellPercentageSlider } from './BatchSellPercentageSlider';
import { SliderStoryWrapper } from '../../../__storybook__/SliderStoryWrapper';

const BatchSellPercentageSliderMeta = {
  title: 'Components / UI / Sliders / BatchSellPercentageSlider',
  component: BatchSellPercentageSlider,
};

export default BatchSellPercentageSliderMeta;

export const Default = {
  render: () => (
    <SliderStoryWrapper
      initialValue={50}
      label="Batch sell percentage"
      showCommittedValue
    >
      {({ value, onValueChange, onDragEnd }) => (
        <BatchSellPercentageSlider
          value={value}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
          testID="batch-sell-percentage-slider"
        />
      )}
    </SliderStoryWrapper>
  ),
};

export const QuarterMarks = {
  render: () => (
    <SliderStoryWrapper initialValue={75} label="75% sell">
      {({ value, onValueChange, onDragEnd }) => (
        <BatchSellPercentageSlider
          value={value}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
        />
      )}
    </SliderStoryWrapper>
  ),
};

export const Zero = {
  render: () => (
    <SliderStoryWrapper initialValue={0} label="Minimum">
      {({ value, onValueChange, onDragEnd }) => (
        <BatchSellPercentageSlider
          value={value}
          onValueChange={onValueChange}
          onDragEnd={onDragEnd}
        />
      )}
    </SliderStoryWrapper>
  ),
};
