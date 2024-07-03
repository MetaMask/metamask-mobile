// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import HelpText from './HelpText';
import {
  DEFAULT_HELPTEXT_TEXT_VARIANT,
  HELPTEXT_TEST_ID,
  SAMPLE_HELPTEXT_TEXT,
  TEXT_COLOR_BY_HELPTEXT_SEVERITY,
} from './HelpText.constants';
import { HelpTextSeverity } from './HelpText.types';

describe('HelpText', () => {
  it('should render default settings correctly', () => {
    const { toJSON } = render(<HelpText>{SAMPLE_HELPTEXT_TEXT}</HelpText>);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render HelpText', () => {
    const { toJSON } = render(<HelpText>{SAMPLE_HELPTEXT_TEXT}</HelpText>);
    const helpTextComponent = wrapper.findWhere(
      (node) => node.prop('testID') === HELPTEXT_TEST_ID,
    );
    expect(helpTextComponent.exists()).toBe(true);
  });
  it('should render the given severity color', () => {
    const testSeverity = HelpTextSeverity.Error;
    const { toJSON } = render(
      <HelpText severity={testSeverity}>{SAMPLE_HELPTEXT_TEXT}</HelpText>,
    );
    const helpTextComponent = wrapper.findWhere(
      (node) => node.prop('testID') === HELPTEXT_TEST_ID,
    );
    expect(helpTextComponent.props().color).toBe(
      TEXT_COLOR_BY_HELPTEXT_SEVERITY[testSeverity],
    );
  });
  it('should render the given text with the appropriate variant', () => {
    const { toJSON } = render(<HelpText>{SAMPLE_HELPTEXT_TEXT}</HelpText>);
    const helpTextComponent = wrapper.findWhere(
      (node) => node.prop('testID') === HELPTEXT_TEST_ID,
    );
    expect(helpTextComponent.props().children).toBe(SAMPLE_HELPTEXT_TEXT);
    expect(helpTextComponent.props().variant).toBe(
      DEFAULT_HELPTEXT_TEXT_VARIANT,
    );
  });
});
