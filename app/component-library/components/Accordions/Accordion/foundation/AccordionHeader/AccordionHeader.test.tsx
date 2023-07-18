// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// External dependencies.
import { IconName } from '../../../../Icons/Icon';

// Internal dependencies.
import AccordionHeader from './AccordionHeader';
import {
  TESTID_ACCORDIONHEADER,
  TESTID_ACCORDIONHEADER_TITLE,
  TESTID_ACCORDIONHEADER_ARROWICON,
  SAMPLE_ACCORDIONHEADER_TITLE,
} from './AccordionHeader.constants';

describe('AccordionHeader - Snapshot', () => {
  it('should render default settings correctly', () => {
    const wrapper = shallow(
      <AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render a rotated down Arrow if isExpanded is true', () => {
    const wrapper = shallow(
      <AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} isExpanded />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AccordionHeader', () => {
  it('should render AccordionHeader', () => {
    const wrapper = shallow(
      <AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />,
    );
    const accordionHeaderComponent = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_ACCORDIONHEADER,
    );
    expect(accordionHeaderComponent.exists()).toBe(true);
  });
  it('should render the given title', () => {
    const wrapper = shallow(
      <AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />,
    );
    const titleElement = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_ACCORDIONHEADER_TITLE,
    );
    expect(titleElement.props().children).toBe(SAMPLE_ACCORDIONHEADER_TITLE);
  });
  it('should render the proper arrow up icon', () => {
    const wrapper = shallow(
      <AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />,
    );
    const iconElement = wrapper.findWhere(
      (node) => node.prop('testID') === TESTID_ACCORDIONHEADER_ARROWICON,
    );
    expect(iconElement.props().name).toBe(IconName.ArrowUp);
  });
  //TODO: Add Test for Pressed state and animation
});
