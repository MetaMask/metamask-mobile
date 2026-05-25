import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import SDKConnectV2OtpModal from './SDKConnectV2OtpModal';
import { SDKConnectV2OtpModalSelectors } from './SDKConnectV2OtpModal.testIds';

const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
const mockUseRoute = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => mockUseRoute(),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNText,
    TouchableOpacity: RNTouchableOpacity,
    View: RNView,
  } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => <RNView testID={testID}>{children}</RNView>,
    BoxAlignItems: { Center: 'Center' },
    BoxBackgroundColor: {
      BackgroundMuted: 'BackgroundMuted',
      WarningMuted: 'WarningMuted',
    },
    BoxFlexDirection: { Row: 'Row' },
    BoxJustifyContent: { Center: 'Center' },
    BottomSheet: ReactActual.forwardRef(
      (
        {
          children,
          goBack,
          testID,
        }: {
          children: React.ReactNode;
          goBack: () => void;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: goBack,
        }));
        return <RNView testID={testID}>{children}</RNView>;
      },
    ),
    BottomSheetHeader: ({
      children,
      onClose,
      closeButtonProps,
    }: {
      children: React.ReactNode;
      onClose: () => void;
      closeButtonProps?: { testID?: string };
    }) => (
      <RNView>
        {children}
        <RNTouchableOpacity
          testID={closeButtonProps?.testID}
          onPress={onClose}
        />
      </RNView>
    ),
    FontWeight: {
      Bold: 'Bold',
      Medium: 'Medium',
    },
    Icon: () => <RNView testID="lock-icon" />,
    IconColor: { WarningDefault: 'WarningDefault' },
    IconName: { Lock: 'Lock' },
    IconSize: { Md: 'Md' },
    Text: ({
      children,
      testID,
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => <RNText testID={testID}>{children}</RNText>,
    TextColor: {
      ErrorDefault: 'ErrorDefault',
      TextAlternative: 'TextAlternative',
      WarningDefault: 'WarningDefault',
    },
    TextVariant: {
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
      HeadingLg: 'HeadingLg',
      HeadingMd: 'HeadingMd',
    },
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) => {
    const translations: Record<string, string> = {
      'sdk_connect_v2.show_otp.modal_title': 'Link MetaMask Agent CLI',
      'sdk_connect_v2.show_otp.modal_description':
        'Pair MetaMask Mobile with your MetaMask Agent CLI.',
      'sdk_connect_v2.show_otp.code_label': 'ENTER THIS CODE IN THE CLI',
      'sdk_connect_v2.show_otp.expires_in': `Expires in ${params?.time}`,
      'sdk_connect_v2.show_otp.expired': 'Code expired',
      'sdk_connect_v2.show_otp.security_notice':
        "Securing the connection first. You'll authorize CLI access in the next step",
    };
    return translations[key] ?? key;
  },
}));

describe('SDKConnectV2OtpModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-26T00:00:00.000Z'));
    jest.clearAllMocks();
    mockCanGoBack.mockReturnValue(true);
    mockUseRoute.mockReturnValue({
      params: {
        otp: '4892AKJ7',
        deadline: Date.now() + 120_000,
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders a formatted OTP and caps the visible countdown at one minute', () => {
    const { getByTestId, getByText } = render(<SDKConnectV2OtpModal />);

    expect(getByTestId(SDKConnectV2OtpModalSelectors.CONTAINER)).toBeTruthy();
    expect(getByText('Link MetaMask Agent CLI')).toBeTruthy();
    expect(
      getByTestId(SDKConnectV2OtpModalSelectors.OTP_CODE),
    ).toHaveTextContent('4892–AKJ7');
    expect(
      getByTestId(SDKConnectV2OtpModalSelectors.COUNTDOWN),
    ).toHaveTextContent('Expires in 01:00');
  });

  it('shows the expired state when the effective deadline elapses', () => {
    const { getByTestId } = render(<SDKConnectV2OtpModal />);

    act(() => {
      jest.advanceTimersByTime(61_000);
    });

    expect(
      getByTestId(SDKConnectV2OtpModalSelectors.COUNTDOWN),
    ).toHaveTextContent('Code expired');
  });

  it('closes the sheet through the header close button', () => {
    const { getByTestId } = render(<SDKConnectV2OtpModal />);

    fireEvent.press(getByTestId(SDKConnectV2OtpModalSelectors.CLOSE_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('does not navigate back when there is no route to pop', () => {
    mockCanGoBack.mockReturnValue(false);
    const { getByTestId } = render(<SDKConnectV2OtpModal />);

    fireEvent.press(getByTestId(SDKConnectV2OtpModalSelectors.CLOSE_BUTTON));

    expect(mockGoBack).not.toHaveBeenCalled();
  });
});
