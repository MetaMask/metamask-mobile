// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';
import { render, screen } from '@testing-library/react-native';

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
    const wrapper = render(
      <AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render a rotated down Arrow if isExpanded is true', () => {
    const wrapper = render(
      <AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} isExpanded />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});

describe('AccordionHeader', () => {
  it('should render AccordionHeader', () => {
    render(<AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />);

    const accordionHeaderComponent = screen.getByTestId(TESTID_ACCORDIONHEADER);
    expect(accordionHeaderComponent).toBeTruthy();
  });
  it('should render the given title', () => {
    render(<AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />);

    const titleElement = screen.getByText(SAMPLE_ACCORDIONHEADER_TITLE);
    expect(titleElement).toBeTruthy();
  });
  it('should render the proper arrow down icon', () => {
    render(<AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />);

    const iconElement = screen.getByTestId(TESTID_ACCORDIONHEADER_ARROWICON);
    const iconProps = iconElement.props;
    expect(iconProps.name).toBe(IconName.ArrowDown);
  });
  //TODO: Add Test for Pressed state and animation
});
