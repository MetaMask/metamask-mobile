// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import Label from './Label';
import {
  DEFAULT_LABEL_TEXT_VARIANT,
  LABEL_TEST_ID,
  SAMPLE_LABEL_TEXT,
} from './Label.constants';

describe('Label', () => {
  it('should render default settings correctly', () => {
    const { toJSON } = render(<Label>{SAMPLE_LABEL_TEXT}</Label>);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render Label', () => {
    const { toJSON } = render(<Label>{SAMPLE_LABEL_TEXT}</Label>);
    const labelComponent = wrapper.findWhere(
      (node) => node.prop('testID') === LABEL_TEST_ID,
    );
    expect(labelComponent.exists()).toBe(true);
  });
  it('should render the given text with the appropriate variant', () => {
    const { toJSON } = render(<Label>{SAMPLE_LABEL_TEXT}</Label>);
    const titleElement = wrapper.findWhere(
      (node) => node.prop('testID') === LABEL_TEST_ID,
    );
    expect(titleElement.props().children).toBe(SAMPLE_LABEL_TEXT);
    expect(titleElement.props().variant).toBe(DEFAULT_LABEL_TEXT_VARIANT);
  });
});
