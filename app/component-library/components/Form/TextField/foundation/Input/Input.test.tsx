// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// External dependencies.
import { TextVariant } from '../../../../Texts/Text';
import { mockTheme } from '../../../../../../util/theme';

// Internal dependencies.
import Input from './Input';
import { INPUT_TEST_ID } from './Input.constants';

describe('Input', () => {
  it('should render correctly', () => {
    const wrapper = render(<Input />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render Input with the correct TextVariant', () => {
    render(<Input textVariant={TextVariant.HeadingSM} />);

    const inputComponent = screen.getByTestId(INPUT_TEST_ID);

    expect(inputComponent).toHaveStyle({
      fontSize: mockTheme.typography.sHeadingSM.fontSize,
    });
  });
  it('should render the correct disabled state when disabled = true', () => {
    render(<Input isDisabled />);

    const inputComponent = screen.getByTestId(INPUT_TEST_ID);

    expect(inputComponent.props.editable).toBe(false);
    expect(inputComponent.props.style.opacity).toBe(0.5);
  });

  it('should not render state styles when isStateStylesDisabled = true', () => {
    render(<Input isStateStylesDisabled />);

    const inputComponent = screen.getByTestId(INPUT_TEST_ID);

    expect(inputComponent.props.style.opacity).toBe(1);
  });
});
