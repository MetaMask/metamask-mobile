// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import userEvent from '@testing-library/user-event';

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
    const { toJSON } = render(
      <AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render a rotated down Arrow if isExpanded is true', () => {
    const { toJSON } = render(
      <AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} isExpanded />,
    );
    expect(toJSON()).toMatchSnapshot();
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
    const titleElement = screen.getByTestId(TESTID_ACCORDIONHEADER_TITLE);
    expect(titleElement.props.children).toBe(SAMPLE_ACCORDIONHEADER_TITLE);
  });
  it('should render the proper arrow down icon', () => {
    render(<AccordionHeader title={SAMPLE_ACCORDIONHEADER_TITLE} />);
    const iconElement = screen.getByTestId(TESTID_ACCORDIONHEADER_ARROWICON);
    expect(iconElement.props.name).toBe(IconName.ArrowDown);
  });
  it('should toggle expanded state when clicked', async () => {
    const onPressMock = jest.fn();
    render(
      <AccordionHeader
        title={SAMPLE_ACCORDIONHEADER_TITLE}
        onPress={onPressMock}
      />,
    );
    const accordionHeader = screen.getByTestId(TESTID_ACCORDIONHEADER);

    await userEvent.click(accordionHeader);

    expect(onPressMock).toHaveBeenCalledTimes(1);
  });
});
