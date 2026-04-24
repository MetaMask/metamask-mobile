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
    render(<Input />);
    expect(screen.getByTestId(INPUT_TEST_ID)).toBeOnTheScreen();
  });

  it('should render Input with the correct TextVariant', () => {
    render(<Input textVariant={TextVariant.HeadingSM} />);
    const input = screen.getByTestId(INPUT_TEST_ID);
    expect(input).toBeOnTheScreen();
    expect(input.props.style.fontSize).toBe(
      mockTheme.typography.sHeadingSM.fontSize,
    );
  });

  it('should render the correct disabled state when disabled = true', () => {
    render(<Input isDisabled />);
    const input = screen.getByTestId(INPUT_TEST_ID);
    expect(input.props.editable).toBe(false);
    expect(input.props.style.opacity).toBe(0.5);
  });

  it('should not render state styles when isStateStylesDisabled = true', () => {
    render(<Input isStateStylesDisabled />);
    const input = screen.getByTestId(INPUT_TEST_ID);
    expect(input.props.style.opacity).toBe(1);
  });
});
