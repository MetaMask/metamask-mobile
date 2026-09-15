import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneySecurityInfoSheet from './MoneySecurityInfoSheet';

const mockCloseBottomSheet = jest.fn();
const mockSetTransactionVerificationEnabled = jest.fn();
let mockRouteParams:
  | {
      defaultMethod?: string;
      variant?: 'info' | 'disable-transaction-verification';
    }
  | undefined = { defaultMethod: 'Passkeys' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../hooks/useMoneySecurityMethods', () => ({
  useMoneySecurityMethods: () => ({
    setTransactionVerificationEnabled: mockSetTransactionVerificationEnabled,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        { children }: { children: React.ReactNode },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockCloseBottomSheet,
        }));
        return <View>{children}</View>;
      },
    ),
  };
});

describe('MoneySecurityInfoSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = { defaultMethod: 'Passkeys' };
  });

  it('describes the default method and closes', () => {
    const { getByText } = renderWithProvider(<MoneySecurityInfoSheet />);

    expect(getByText('2-step verification is on')).toHaveStyle({
      textAlign: 'center',
    });
    const description = getByText(
      'Your passkeys will be required for every Money account transaction, keeping your account safe.',
    );

    expect(description).toBeOnTheScreen();
    expect(description).toHaveStyle({ textAlign: 'left' });

    fireEvent.press(getByText('Got it'));
    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('warns before disabling transaction verification', () => {
    mockRouteParams = { variant: 'disable-transaction-verification' };
    const { getByText } = renderWithProvider(<MoneySecurityInfoSheet />);

    expect(getByText('Turn off 2-step verification?')).toBeOnTheScreen();
    expect(
      getByText(
        'Your Money account will no longer have an additional layer of protection for transactions. This increases the risk of unauthorized transactions if another security method is compromised.',
      ),
    ).toBeOnTheScreen();

    fireEvent.press(getByText('Disable'));

    expect(mockSetTransactionVerificationEnabled).toHaveBeenCalledWith(false);
    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
  });

  it('keeps transaction verification enabled when cancelled', () => {
    mockRouteParams = { variant: 'disable-transaction-verification' };
    const { getByText } = renderWithProvider(<MoneySecurityInfoSheet />);

    fireEvent.press(getByText('Cancel'));

    expect(mockSetTransactionVerificationEnabled).not.toHaveBeenCalled();
    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
