import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MoneyAuthenticatorKeySheet from './MoneyAuthenticatorKeySheet';
import { MoneyAuthenticatorKeySheetTestIds } from './MoneyAuthenticatorKeySheet.testIds';
import Routes from '../../../../../constants/navigation/Routes';

const mockCloseBottomSheet = jest.fn((callback?: () => void) => callback?.());
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: mockNavigate }),
  useRoute: () => ({ params: { entryPoint: 'security' } }),
}));

jest.mock('react-native-qrcode-svg', () => {
  const { View } = jest.requireActual('react-native');
  return ({ testID }: { testID?: string }) => <View testID={testID} />;
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const { forwardRef, useImperativeHandle } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    ...actual,
    BottomSheet: forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        ref: React.Ref<unknown>,
      ) => {
        useImperativeHandle(ref, () => ({
          onCloseBottomSheet: mockCloseBottomSheet,
        }));
        return <View testID={testID}>{children}</View>;
      },
    ),
  };
});

describe('MoneyAuthenticatorKeySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the authenticator QR code and continues after scanning', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <MoneyAuthenticatorKeySheet />,
    );

    expect(getByText('Set up using QR code')).toBeOnTheScreen();
    expect(
      getByText('Scan this QR code with your authenticator app.'),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MoneyAuthenticatorKeySheetTestIds.QR_CODE),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(MoneyAuthenticatorKeySheetTestIds.SCANNED_BUTTON),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.AUTHENTICATOR, {
      entryPoint: 'security',
      initialStep: 'verify',
    });
  });
});
