/* eslint-disable no-console */
import React from 'react';
import { MusdCalculatorSlider } from './MusdCalculatorSlider';
import { AmountSliderStoryWrapper } from '../../../__storybook__/SliderStoryWrapper';
import { MUSD_SLIDER_INITIAL_AMOUNT } from '../../hooks/useMusdCalculatorSlider';

const MusdCalculatorSliderMeta = {
  title: 'Components / UI / Sliders / MusdCalculatorSlider',
  component: MusdCalculatorSlider,
};

export default MusdCalculatorSliderMeta;

export const Default = {
  render: () => (
    <AmountSliderStoryWrapper initialAmount={MUSD_SLIDER_INITIAL_AMOUNT}>
      {({ amount, onAmountChange }) => (
        <MusdCalculatorSlider
          amount={amount}
          onAmountChange={onAmountChange}
          amountLabel="Deposit amount"
        />
      )}
    </AmountSliderStoryWrapper>
  ),
};

export const Minimum = {
  render: () => (
    <AmountSliderStoryWrapper initialAmount={100}>
      {({ amount, onAmountChange }) => (
        <MusdCalculatorSlider amount={amount} onAmountChange={onAmountChange} />
      )}
    </AmountSliderStoryWrapper>
  ),
};

export const Maximum = {
  render: () => (
    <AmountSliderStoryWrapper initialAmount={10000}>
      {({ amount, onAmountChange }) => (
        <MusdCalculatorSlider amount={amount} onAmountChange={onAmountChange} />
      )}
    </AmountSliderStoryWrapper>
  ),
};
