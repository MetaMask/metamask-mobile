import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import EmailOtpStub, { EmailOtpStubSelectorsIDs } from './EmailOtpStub';

describe('EmailOtpStub', () => {
  it('renders the temporary email collection UI', () => {
    const { getByTestId } = renderWithProvider(
      <EmailOtpStub onBack={jest.fn()} onSuccess={jest.fn()} />,
    );

    expect({
      containerVisible: Boolean(
        getByTestId(EmailOtpStubSelectorsIDs.CONTAINER),
      ),
      emailValue: getByTestId(EmailOtpStubSelectorsIDs.EMAIL_INPUT).props.value,
      continueDisabled: getByTestId(EmailOtpStubSelectorsIDs.CONTINUE_BUTTON)
        .props.accessibilityState.disabled,
    }).toMatchInlineSnapshot(`
      {
        "containerVisible": true,
        "continueDisabled": true,
        "emailValue": "",
      }
    `);
  });

  it('submits the trimmed email', async () => {
    const onSuccess = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = renderWithProvider(
      <EmailOtpStub onBack={jest.fn()} onSuccess={onSuccess} />,
    );

    fireEvent.changeText(
      getByTestId(EmailOtpStubSelectorsIDs.EMAIL_INPUT),
      '  user@example.com  ',
    );
    fireEvent.press(getByTestId(EmailOtpStubSelectorsIDs.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('user@example.com');
    });
  });

  it('calls onBack from the header', () => {
    const onBack = jest.fn();
    const { getByTestId } = renderWithProvider(
      <EmailOtpStub onBack={onBack} onSuccess={jest.fn()} />,
    );

    fireEvent.press(getByTestId(EmailOtpStubSelectorsIDs.BACK_BUTTON));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
