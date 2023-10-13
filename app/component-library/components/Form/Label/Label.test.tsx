// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Label from './Label';
import {
  DEFAULT_LABEL_TEXT_VARIANT,
  LABEL_TEST_ID,
  SAMPLE_LABEL_TEXT,
} from './Label.constants';

describe('Label', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(<Label>{SAMPLE_LABEL_TEXT}</Label>);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render Label', () => {
    const wrapper = shallow(<Label>{SAMPLE_LABEL_TEXT}</Label>);
    const labelComponent = wrapper.findWhere(
      (node) => node.prop('testID') === LABEL_TEST_ID,
    );
    expect(labelComponent.exists()).toBe(true);
  });
  it('should render the given text with the appropriate variant', () => {
    const wrapper = shallow(<Label>{SAMPLE_LABEL_TEXT}</Label>);
    const titleElement = wrapper.findWhere(
      (node) => node.prop('testID') === LABEL_TEST_ID,
    );
    expect(titleElement.props().children).toBe(SAMPLE_LABEL_TEXT);
    expect(titleElement.props().variant).toBe(DEFAULT_LABEL_TEXT_VARIANT);
  });
});
