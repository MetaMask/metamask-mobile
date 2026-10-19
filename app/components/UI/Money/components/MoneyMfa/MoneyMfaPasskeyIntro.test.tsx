import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneyMfaPasskeyIntro from './MoneyMfaPasskeyIntro';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';

describe('MoneyMfaPasskeyIntro', () => {
  it('renders the title and description', () => {
    const { getByText } = render(
      <MoneyMfaPasskeyIntro onAddPasskey={jest.fn()} />,
    );

    expect(getByText(strings('money.mfa.intro_title'))).toBeOnTheScreen();
    expect(getByText(strings('money.mfa.intro_description'))).toBeOnTheScreen();
  });

  it.each([
    'money.mfa.intro_benefit_login',
    'money.mfa.intro_benefit_devices',
    'money.mfa.intro_benefit_approve',
  ])('renders the %s benefit', (labelKey) => {
    const { getByText } = render(
      <MoneyMfaPasskeyIntro onAddPasskey={jest.fn()} />,
    );

    expect(getByText(strings(labelKey))).toBeOnTheScreen();
  });

  it('calls onAddPasskey when Add passkey is pressed', () => {
    const onAddPasskey = jest.fn();
    const { getByTestId } = render(
      <MoneyMfaPasskeyIntro onAddPasskey={onAddPasskey} />,
    );

    fireEvent.press(getByTestId(MoneyMfaTestIds.INTRO_BUTTON));

    expect(onAddPasskey).toHaveBeenCalledTimes(1);
  });

  it('renders the Add passkey label on the button', () => {
    const { getByTestId } = render(
      <MoneyMfaPasskeyIntro onAddPasskey={jest.fn()} isFullScreen />,
    );

    expect(getByTestId(MoneyMfaTestIds.INTRO_BUTTON)).toHaveTextContent(
      strings('money.mfa.intro_cta'),
    );
  });
});
