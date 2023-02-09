// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName, IconProps, IconSize } from '../../Icon';
import { TextVariant } from '../Text/Text.types';

// Internal dependencies.
import TextWithPrefixIcon from './TextWithPrefixIcon';
import {
  TEST_SAMPLE_TEXT,
  TEXT_WITH_PREFIX_ICON_TEST_ID,
  TEXT_WITH_PREFIX_ICON_ICON_TEST_ID,
  TEXT_WITH_PREFIX_ICON_TEXT_TEST_ID,
} from './TextWithPrefixIcon.constants';

const sampleIconProps: IconProps = {
  name: IconName.AddOutline,
};

describe('TextWithPrefixIcon - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <TextWithPrefixIcon
        variant={TextVariant.HeadingSMRegular}
        iconProps={sampleIconProps}
      >
        {TEST_SAMPLE_TEXT}
      </TextWithPrefixIcon>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('TextWithPrefixIcon', () => {
  it('should render TextWithPrefixIcon', () => {
    const wrapper = shallow(
      <TextWithPrefixIcon
        variant={TextVariant.HeadingSMRegular}
        iconProps={sampleIconProps}
      >
        {TEST_SAMPLE_TEXT}
      </TextWithPrefixIcon>,
    );
    const TextWithPrefixIconComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TEXT_WITH_PREFIX_ICON_TEST_ID,
    );
    expect(TextWithPrefixIconComponent.exists()).toBe(true);
  });
  it('should render the given icon name and size', () => {
    const testIconName = IconName.BankFilled;
    const testIconSize = IconSize.Xss;
    sampleIconProps.name = testIconName;
    sampleIconProps.size = testIconSize;
    const wrapper = shallow(
      <TextWithPrefixIcon
        variant={TextVariant.HeadingSMRegular}
        iconProps={sampleIconProps}
      >
        {TEST_SAMPLE_TEXT}
      </TextWithPrefixIcon>,
    );
    const iconElement = wrapper.findWhere(
      (node) => node.prop('testID') === TEXT_WITH_PREFIX_ICON_ICON_TEST_ID,
    );
    expect(iconElement.props().name).toBe(testIconName);
    expect(iconElement.props().size).toBe(testIconSize);
  });
  it('should render the given text with the appropriate variant', () => {
    const testTextVariant = TextVariant.BodySM;
    const wrapper = shallow(
      <TextWithPrefixIcon variant={testTextVariant} iconProps={sampleIconProps}>
        {TEST_SAMPLE_TEXT}
      </TextWithPrefixIcon>,
    );
    const titleElement = wrapper.findWhere(
      (node) => node.prop('testID') === TEXT_WITH_PREFIX_ICON_TEXT_TEST_ID,
    );
    expect(titleElement.props().children).toBe(TEST_SAMPLE_TEXT);
    expect(titleElement.props().variant).toBe(testTextVariant);
  });
});
