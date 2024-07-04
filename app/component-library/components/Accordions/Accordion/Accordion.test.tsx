// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
    const { toJSON } = render(
      <Accordion title={SAMPLE_ACCORDION_TITLE}>
        <View />
      </Accordion>,
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('should render a proper expanded state', () => {
    const { toJSON } = render(
      <Accordion title={SAMPLE_ACCORDION_TITLE} isExpanded>
        <View />
      </Accordion>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});

describe('Accordion', () => {
  it('should render Accordion', () => {
    render(
      <Accordion title={SAMPLE_ACCORDION_TITLE}>
        <View />
      </Accordion>,
    );
    const AccordionComponent = screen.getByTestId(TESTID_ACCORDION);
    expect(AccordionComponent).toBeTruthy();
  });

  it('should render Accordion content if isExpanded = true', () => {
    render(
      <Accordion title={SAMPLE_ACCORDION_TITLE} isExpanded>
        <View />
      </Accordion>,
    );
    const AccordionContentComponent = screen.getByTestId(
      TESTID_ACCORDION_CONTENT,
    );
    expect(AccordionContentComponent).toBeTruthy();
  });

  it('should NOT render Accordion content if isExpanded = false', () => {
    render(
      <Accordion title={SAMPLE_ACCORDION_TITLE}>
        <View />
      </Accordion>,
    );
    const AccordionContentComponent = screen.queryByTestId(
      TESTID_ACCORDION_CONTENT,
    );
    expect(AccordionContentComponent).toBeNull();
  });
  //TODO: Add Test for animation
});
