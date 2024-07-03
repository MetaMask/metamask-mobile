// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { TextVariant } from '../../../../Texts/Text';
import { mockTheme } from '../../../../../../util/theme';

// Internal dependencies.
import Input from './Input';
import { INPUT_TEST_ID } from './Input.constants';

describe('Input', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<Input />);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render Input with the correct TextVariant', () => {
    const { toJSON } = render(<Input textVariant={TextVariant.HeadingSM} />);
    const inputComponent = wrapper.findWhere(
      (node) => node.prop('testID') === INPUT_TEST_ID,
    );
    expect(inputComponent.props().style.fontSize).toBe(
      mockTheme.typography.sHeadingSM.fontSize,
    );
  });
  it('should render the correct disabled state when disabled = true', () => {
    const { toJSON } = render(<Input isDisabled />);
    const inputComponent = wrapper.findWhere(
      (node) => node.prop('testID') === INPUT_TEST_ID,
    );
    expect(inputComponent.props().editable).toBe(false);
    expect(inputComponent.props().style.opacity).toBe(0.5);
  });

  it('should not render state styles when isStateStylesDisabled = true', () => {
    const { toJSON } = render(<Input isStateStylesDisabled />);
    const inputComponent = wrapper.findWhere(
      (node) => node.prop('testID') === INPUT_TEST_ID,
    );
    expect(inputComponent.props().style.opacity).toBe(1);
  });
});
