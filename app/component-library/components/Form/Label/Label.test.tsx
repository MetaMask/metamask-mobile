// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// Internal dependencies.
import Label from './Label';
import {
  DEFAULT_LABEL_TEXT_VARIANT,
  LABEL_TEST_ID,
  SAMPLE_LABEL_TEXT,
} from './Label.constants';

describe('Label', () => {
  it('should render default settings correctly', () => {
    const component = render(<Label>{SAMPLE_LABEL_TEXT}</Label>);
    expect(component).toMatchSnapshot();
  });
  it('should render Label', () => {
    render(<Label>{SAMPLE_LABEL_TEXT}</Label>);
    expect(screen.getByTestId(LABEL_TEST_ID)).toBeDefined();
  });
  it('should render the given text with the appropriate variant', () => {
    render(<Label>{SAMPLE_LABEL_TEXT}</Label>);
    expect(screen.getByText(SAMPLE_LABEL_TEXT)).toBeDefined();
  });
});
