// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
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
    const { toJSON } = render(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE}>
        <View />
      </Accordion>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render a proper expanded state', () => {
    const { toJSON } = render(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE} isExpanded>
        <View />
      </Accordion>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('Accordion', () => {
  it('should render Accordion', () => {
    const { getByTestId } = render(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE}>
        <View />
      </Accordion>,
    );
    const AccordionComponent = getByTestId(ACCORDION_TEST_ID);
    expect(AccordionComponent).toBeTruthy();
  });

  it('should render Accordion content if isExpanded = true', () => {
    const { getByTestId } = render(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE} isExpanded>
        <View />
      </Accordion>,
    );
    const AccordionContentComponent = getByTestId(ACCORDION_CONTENT_TEST_ID);
    expect(AccordionContentComponent).toBeTruthy();
  });

  it('should NOT render Accordion content if isExpanded = false', () => {
    const { queryByTestId } = render(
      <Accordion title={TEST_ACCORDION_HEADER_TITLE}>
        <View />
      </Accordion>,
    );
    const AccordionContentComponent = queryByTestId(ACCORDION_CONTENT_TEST_ID);
    expect(AccordionContentComponent).toBeNull();
  });
  //TODO: Add Test for animation
});
