// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { View } from 'react-native';

// External dependencies.
import { TEST_ACCORDION_HEADER_TITLE } from './foundation/AccordionHeader/AccordionHeader.constants';

// Internal dependencies.
import Accordion from './Accordion';
import {
  ACCORDION_TEST_ID,
  ACCORDION_CONTENT_TEST_ID,
} from './Accordion.constants';

describe('Accordion - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE}>
        <View />
      </Accordion>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render a proper expanded state', () => {
    const wrapper = shallow(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE} isExpanded>
        <View />
      </Accordion>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('Accordion', () => {
  it('should render Accordion', () => {
    const wrapper = shallow(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE}>
        <View />
      </Accordion>,
    );
    const AccordionComponent = wrapper.findWhere(
      (node) => node.prop('testID') === ACCORDION_TEST_ID,
    );
    expect(AccordionComponent.exists()).toBe(true);
  });

  it('should render Accordion content if isExpanded = true', () => {
    const wrapper = shallow(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE} isExpanded>
        <View />
      </Accordion>,
    );
    const AccordionContentComponent = wrapper.findWhere(
      (node) => node.prop('testID') === ACCORDION_CONTENT_TEST_ID,
    );
    expect(AccordionContentComponent.exists()).toBe(true);
  });

  it('should NOT render Accordion content if isExpanded = false', () => {
    const wrapper = shallow(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE}>
        <View />
      </Accordion>,
    );
    const AccordionContentComponent = wrapper.findWhere(
      (node) => node.prop('testID') === ACCORDION_CONTENT_TEST_ID,
    );
    expect(AccordionContentComponent.exists()).toBe(false);
  });
  //TODO: Add Test for animation
});
