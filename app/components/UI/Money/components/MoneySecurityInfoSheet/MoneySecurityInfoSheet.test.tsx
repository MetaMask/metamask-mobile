import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import MoneySecurityInfoSheet from './MoneySecurityInfoSheet';

const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockNavigate = jest.fn();
let mockRouteParams:
  | {
      defaultMethod?: string;
      variant?: 'info' | 'disable-transaction-verification';
    }
  | undefined = { defaultMethod: 'Passkeys' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }),
  useRoute: () => ({ params: mockRouteParams }),
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
        'Your Money account will no longer have an extra layer of protection. If another security method is compromised, unauthorized transactions become more likely.',
      ),
    ).toBeOnTheScreen();

    fireEvent.press(getByText('Disable'));

    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
      screen: Routes.MONEY.MODALS.SECURITY_VERIFICATION_SHEET,
      params: {
        action: { type: 'disable-transaction-verification' },
      },
    });
  });

  it('keeps transaction verification enabled when cancelled', () => {
    mockRouteParams = { variant: 'disable-transaction-verification' };
    const { getByText } = renderWithProvider(<MoneySecurityInfoSheet />);

    fireEvent.press(getByText('Cancel'));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockCloseBottomSheet).toHaveBeenCalledTimes(1);
  });
});
