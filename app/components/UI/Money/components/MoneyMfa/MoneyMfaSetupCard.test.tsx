import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneyMfaSetupCard from './MoneyMfaSetupCard';
import { MoneyMfaTestIds } from './MoneyMfa.testIds';
import { useActiveMfaFlow } from '../../../../../util/identity/mfa/engine/useActiveMfaFlow';

jest.mock('../../../../../util/identity/mfa/engine/useActiveMfaFlow', () => ({
  useActiveMfaFlow: jest.fn(),
}));

const mockUseActiveMfaFlow = jest.mocked(useActiveMfaFlow);

describe('MoneyMfaSetupCard', () => {
  beforeEach(() => {
    mockUseActiveMfaFlow.mockReturnValue(undefined);
  });

  it('renders the card title, description and call to action', () => {
    const { getByTestId, getByText } = render(
      <MoneyMfaSetupCard onSetUp={jest.fn()} />,
    );

    expect(getByTestId(MoneyMfaTestIds.SETUP_CARD)).toBeOnTheScreen();
    expect(getByText(strings('money.mfa.card_title'))).toBeOnTheScreen();
    expect(getByText(strings('money.mfa.card_description'))).toBeOnTheScreen();
    expect(getByTestId(MoneyMfaTestIds.SETUP_CARD_BUTTON)).toHaveTextContent(
      strings('money.mfa.card_cta'),
    );
  });

  it('calls onSetUp when the call to action is pressed', () => {
    const onSetUp = jest.fn();
    const { getByTestId } = render(<MoneyMfaSetupCard onSetUp={onSetUp} />);

    fireEvent.press(getByTestId(MoneyMfaTestIds.SETUP_CARD_BUTTON));

    expect(onSetUp).toHaveBeenCalledTimes(1);
  });

  it('disables the call to action while the verification is starting', () => {
    mockUseActiveMfaFlow.mockReturnValue({
      flow: {},
      state: { step: { name: 'idle' } },
    } as ReturnType<typeof useActiveMfaFlow>);
    const onSetUp = jest.fn();
    const { getByTestId } = render(<MoneyMfaSetupCard onSetUp={onSetUp} />);

    fireEvent.press(getByTestId(MoneyMfaTestIds.SETUP_CARD_BUTTON));

    expect(onSetUp).not.toHaveBeenCalled();
  });
});
