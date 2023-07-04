// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { TextVariant } from '../../../component-library/components/Texts/Text/Text.types';

// Internal dependencies.
import TextEstimated from './TextEstimated';
import {
  TEXT_ESTIMATED_TEST_ID,
  TEST_SAMPLE_TEXT,
} from './TextEstimated.constants';

describe('TextEstimated - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <TextEstimated variant={TextVariant.HeadingSMRegular}>
        {TEST_SAMPLE_TEXT}
      </TextEstimated>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('TextEstimated', () => {
  it('should render TextEstimated', () => {
    const wrapper = shallow(
      <TextEstimated variant={TextVariant.HeadingSMRegular}>
        {TEST_SAMPLE_TEXT}
      </TextEstimated>,
    );
    const TextEstimatedComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXT_ESTIMATED_TEST_ID,
    );
    expect(TextEstimatedComponent.exists()).toBe(true);
  });
});
