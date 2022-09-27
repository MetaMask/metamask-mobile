// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '../../../../Icon';

// Internal dependencies.
import AccordionHeader from './AccordionHeader';
import {
  ACCORDION_HEADER_TEST_ID,
  ACCORDION_HEADER_TITLE_TEST_ID,
  ACCORDION_HEADER_ARROW_ICON_TEST_ID,
  TEST_ACCORDION_HEADER_TITLE,
} from './AccordionHeader.constants';

describe('AccordionHeader - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <AccordionHeader title={TEST_ACCORDION_HEADER_TITLE} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render a rotated down Arrow if isExpanded is true', () => {
    const wrapper = shallow(
      <AccordionHeader title={TEST_ACCORDION_HEADER_TITLE} isExpanded />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AccordionHeader', () => {
  it('should render AccordionHeader', () => {
    const wrapper = shallow(
      <AccordionHeader title={TEST_ACCORDION_HEADER_TITLE} />,
    );
    const accordionHeaderComponent = wrapper.findWhere(
      (node) => node.prop('testID') === ACCORDION_HEADER_TEST_ID,
    );
    expect(accordionHeaderComponent.exists()).toBe(true);
  });
  it('should render the given title', () => {
    const wrapper = shallow(
      <AccordionHeader title={TEST_ACCORDION_HEADER_TITLE} />,
    );
    const titleElement = wrapper.findWhere(
      (node) => node.prop('testID') === ACCORDION_HEADER_TITLE_TEST_ID,
    );
    expect(titleElement.props().children).toBe(TEST_ACCORDION_HEADER_TITLE);
  });
  it('should render the proper arrow up icon', () => {
    const wrapper = shallow(
      <AccordionHeader title={TEST_ACCORDION_HEADER_TITLE} />,
    );
    const iconElement = wrapper.findWhere(
      (node) => node.prop('testID') === ACCORDION_HEADER_ARROW_ICON_TEST_ID,
    );
    expect(iconElement.props().name).toBe(IconName.ArrowUpOutline);
  });
  //TODO: Add Test for Pressed state and animation
});
