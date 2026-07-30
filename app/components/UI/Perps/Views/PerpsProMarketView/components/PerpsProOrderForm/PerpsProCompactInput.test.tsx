import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsProCompactInput from './PerpsProCompactInput';

// Mock Input to expose a spyable `focus` via its forwarded ref, mirroring the
// design system's real `forwardRef<TextInput>` contract.
const mockInputFocus = jest.fn();
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const MockReact = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    ...actual,
    Input: MockReact.forwardRef(
      (props: Record<string, unknown>, ref: React.Ref<unknown>) => {
        MockReact.useImperativeHandle(ref, () => ({ focus: mockInputFocus }));
        return MockReact.createElement(TextInput, props);
      },
    ),
  };
});

const defaultProps = {
  label: 'Size (USD)',
  value: '',
  onChangeText: jest.fn(),
  testID: 'size-input',
};

describe('PerpsProCompactInput', () => {
  beforeEach(() => {
    mockInputFocus.mockClear();
  });

  it('focuses the input when the label is pressed', () => {
    render(<PerpsProCompactInput {...defaultProps} />);

    fireEvent.press(screen.getByText('Size (USD)'));

    expect(mockInputFocus).toHaveBeenCalledTimes(1);
  });

  it('does not focus the input on render, only on label press', () => {
    render(<PerpsProCompactInput {...defaultProps} />);

    expect(mockInputFocus).not.toHaveBeenCalled();
  });

  it('adds top spacing above the footer to match the Figma slider row', () => {
    render(<PerpsProCompactInput {...defaultProps} footer={<></>} />);

    expect(screen.getByTestId(`${defaultProps.testID}-footer`)).toHaveStyle({
      marginTop: 12,
    });
  });

  it('omits the footer wrapper entirely when no footer is provided', () => {
    render(<PerpsProCompactInput {...defaultProps} />);

    expect(
      screen.queryByTestId(`${defaultProps.testID}-footer`),
    ).not.toBeOnTheScreen();
  });
});
