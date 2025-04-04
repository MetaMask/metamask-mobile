// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { View } from 'react-native';

// Internal dependencies.
import Accordion from './Accordion';
import {
  TESTID_ACCORDION,
  TESTID_ACCORDION_CONTENT,
  SAMPLE_ACCORDION_TITLE,
} from './Accordion.constants';

describe('Accordion - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <Accordion title={SAMPLE_ACCORDION_TITLE}>
        <View />
      </Accordion>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render a proper expanded state', () => {
    const wrapper = shallow(
      <Accordion title={SAMPLE_ACCORDION_TITLE} isExpanded>
        <View />
      </Accordion>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Accordion', () => {
  it('should render Accordion', () => {
    const wrapper = shallow(
      <Accordion title={SAMPLE_ACCORDION_TITLE}>
        <View />
      </Accordion>,
    );
    const AccordionComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_ACCORDION,
    );
    expect(AccordionComponent.exists()).toBe(true);
  });

  it('should render Accordion content if isExpanded = true', () => {
    const wrapper = shallow(
      <Accordion title={SAMPLE_ACCORDION_TITLE} isExpanded>
        <View />
      </Accordion>,
    );
    const AccordionContentComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_ACCORDION_CONTENT,
    );
    expect(AccordionContentComponent.exists()).toBe(true);
  });

  it('should NOT render Accordion content if isExpanded = false', () => {
    const wrapper = shallow(
      <Accordion title={SAMPLE_ACCORDION_TITLE}>
        <View />
      </Accordion>,
    );
    const AccordionContentComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_ACCORDION_CONTENT,
    );
    expect(AccordionContentComponent.exists()).toBe(false);
  });
  //TODO: Add Test for animation
});
