// Third party dependencies.
import React from 'react';
import { render, screen } from '@testing-library/react-native';

// External dependencies.
import { TextVariant } from '../../../../component-library/components/Texts/Text';
import { mockTheme } from '../../../../util/theme';

// Internal dependencies.
import Input from './index';
import { INPUT_TEST_ID } from '../../../../component-library/components/Form/TextField/foundation/Input/Input.constants';

describe('SRP -> Input', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<Input />);
    expect(toJSON()).toMatchSnapshot();
  });
  it('should render Input with the correct TextVariant', () => {
    render(<Input textVariant={TextVariant.HeadingSM} />);
    const inputComponent = screen.getByTestId(INPUT_TEST_ID);
    expect(inputComponent.props.style.fontSize).toBe(
      mockTheme.typography.sHeadingSM.fontSize,
    );
  });
  it('should render the correct disabled state when disabled = true', () => {
    render(<Input isDisabled />);
    const inputComponent = screen.getByTestId(INPUT_TEST_ID);
    expect(inputComponent).toHaveProp('editable', false);
    expect(inputComponent.props.style.opacity).toBe(0.5);
  });

  it('should not render state styles when isStateStylesDisabled = true', () => {
    render(<Input isStateStylesDisabled />);
    const inputComponent = screen.getByTestId(INPUT_TEST_ID);
    expect(inputComponent.props.style.opacity).toBe(1);
  });
});
