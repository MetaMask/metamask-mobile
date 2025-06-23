import { renderInterface } from '../testUtils';
import { Input, Box, Form } from '@metamask/snaps-sdk/jsx';
import { fireEvent } from '@testing-library/react-native';
import { INPUT_TEST_ID } from '../../../../component-library/components/Form/TextField/foundation/Input/Input.constants';
import { TEXTFIELD_TEST_ID } from '../../../../component-library/components/Form/TextField/TextField.constants';

jest.mock('../../../../core/Engine/Engine', () => ({
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    SnapInterfaceController: {
      updateInterfaceState: jest.fn(),
    },
  },
}));

describe('SnapUIInput', () => {
  const clearBorderColor = '#b7bbc8';
  const focusedBorderColor = '#4459ff';

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders with initial value', () => {
    const { getByTestId, toJSON } = renderInterface(
      Box({
        children: Input({
          name: 'testInput',
        }),
      }),
      { state: { testInput: 'initial value' } },
    );

    const input = getByTestId(INPUT_TEST_ID);

    expect(input.props.value).toBe('initial value');
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles input changes', () => {
    const { getByTestId } = renderInterface(
      Box({
        children: Input({
          name: 'testInput',
        }),
      }),
    );

    const input = getByTestId(INPUT_TEST_ID);
    fireEvent.changeText(input, 'test');

    expect(input.props.value).toBe('test');
  });

  it('handles form input changes', () => {
    const { getByTestId } = renderInterface(
      Box({
        children: Form({
          name: 'testForm',
          children: [Input({ name: 'testInput' })],
        }),
      }),
    );

    const input = getByTestId(INPUT_TEST_ID);
    fireEvent.changeText(input, 'test');

    expect(input.props.value).toBe('test');
  });

  it('handles focus events', () => {
    const { getByTestId } = renderInterface(
      Box({
        children: Input({
          name: 'testInput',
        }),
      }),
    );

    const input = getByTestId(INPUT_TEST_ID);
    const textfield = getByTestId(TEXTFIELD_TEST_ID);

    const initialBorderColor = textfield.props.style.borderColor;
    expect(initialBorderColor).toBe(clearBorderColor);

    fireEvent(input, 'focus');

    const afterFocusBorderColor = textfield.props.style.borderColor;
    expect(afterFocusBorderColor).toBe(focusedBorderColor);
  });

  it('handles blur events', () => {
    const { getByTestId } = renderInterface(
      Box({
        children: Input({
          name: 'testInput',
        }),
      }),
    );

    const input = getByTestId(INPUT_TEST_ID);
    const textfield = getByTestId(TEXTFIELD_TEST_ID);

    fireEvent(input, 'focus');

    const afterFocusBorderColor = textfield.props.style.borderColor;
    expect(afterFocusBorderColor).toBe(focusedBorderColor);

    fireEvent(input, 'blur');

    const afterBlurBorderColor = textfield.props.style.borderColor;
    expect(afterBlurBorderColor).toBe(clearBorderColor);
  });

  it('handles disabled input', () => {
    const { getByTestId, toJSON } = renderInterface(
      Box({
        children: Input({
          name: 'testInput',
          disabled: true,
        }),
      }),
    );

    const input = getByTestId(INPUT_TEST_ID);
    expect(input.props.editable).toBe(false);
    expect(toJSON()).toMatchSnapshot();
  });

  it('updates value when initialValue changes', () => {
    const { getByTestId, updateInterface, getByDisplayValue } = renderInterface(
      Box({ children: Input({ name: 'testInput' }) }),
      { state: { testInput: 'initial value' } }
    );

    const input = getByTestId(INPUT_TEST_ID);
    expect(input.props.value).toBe('initial value');

    updateInterface(
      Box({ children: [Input({ name: 'testInput' }), Input({ name: 'testInput2' })] }),
      { testInput: 'updated value' }
    );

    expect(getByDisplayValue('updated value')).toBeTruthy();
  });

  it('maintains focus state when re-rendered', () => {
    const { getAllByTestId, updateInterface } = renderInterface(
      Box({
        children: Input({
          name: 'testInput',
        }),
      }),
    );

    const input = getAllByTestId(INPUT_TEST_ID)[0];
    const textfield = getAllByTestId(TEXTFIELD_TEST_ID)[0];

    const initialBorderColor = textfield.props.style.borderColor;
    expect(initialBorderColor).toBe(clearBorderColor);

    fireEvent(input, 'focus');

    const afterFocusBorderColor = textfield.props.style.borderColor;
    expect(afterFocusBorderColor).toBe(focusedBorderColor);

    updateInterface(
      Box({ children: [Input({ name: 'testInput' }), Input({ name: 'testInput2' })] })
    );

    const afterTextfield = getAllByTestId(TEXTFIELD_TEST_ID)[0];
    expect(afterTextfield.props.style.borderColor).toBe(focusedBorderColor);
  });
});
