import React from 'react';
import { Linking } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import VbaVerifyIdentity from './VerifyIdentity';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import { METAMASK_PRIVACY_POLICY_URL, METAMASK_TERMS_URL } from './constants';
import { useKycSessionDisclaimers } from './hooks/useKycSessionDisclaimers';

jest.mock('./hooks/useKycSessionDisclaimers');
const mockUseKycSessionDisclaimers = jest.mocked(useKycSessionDisclaimers);
const mockRetry = jest.fn();
const mockOnSuccess = jest.fn();

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const MOCK_SHEET_OVERLAY = 'mock-terms-sheet-overlay';

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { Pressable, View } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        onClose,
        testID,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
        testID?: string;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: (callback?: () => void) => {
          onClose?.();
          callback?.();
        },
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(Pressable, {
          testID: MOCK_SHEET_OVERLAY,
          onPress: onClose,
        }),
        children,
      );
    },
  );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
  };
});

const catalogDisclaimers = [
  {
    id: 'idOS:idos-privacy',
    key: 'idos-privacy',
    version: '1',
    title: 'idOS Privacy Policy',
    url: 'https://idos.example/privacy',
  },
  {
    id: 'kycProvider:sumsub-terms',
    key: 'sumsub-terms',
    version: '2',
    title: 'Sumsub Terms and Conditions',
    url: 'https://sumsub.example/terms',
  },
];

const renderScreen = () =>
  renderWithProvider(<VbaVerifyIdentity onSuccess={mockOnSuccess} />);

const openTermsSheet = (
  getByTestId: ReturnType<typeof renderScreen>['getByTestId'],
) =>
  fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON));

describe('VbaVerifyIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: catalogDisclaimers,
      isLoading: false,
      error: null,
      retry: mockRetry,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders the introduction copy, verification steps, and footer', () => {
    const { getByText, getByTestId } = renderScreen();

    expect(getByText('Verify your identity')).toBeOnTheScreen();
    expect(
      getByText(
        "This usually only takes a few minutes. You'll need a valid, government-issued photo ID on hand.",
      ),
    ).toBeOnTheScreen();
    expect(getByText('Photograph your ID')).toBeOnTheScreen();
    expect(getByText('Take a selfie')).toBeOnTheScreen();
    expect(getByText('Confirm your details')).toBeOnTheScreen();
    expect(getByText('Answer a few questions')).toBeOnTheScreen();
    expect(
      getByText(
        "Your information is encrypted and shared securely with our verification providers. You'll review the details before continuing.",
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.POWERED_BY),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeEnabled();
  });

  it('returns to Money home when the header back button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('keeps the terms sheet closed until continue is pressed', () => {
    const { queryByTestId } = renderScreen();

    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).not.toBeOnTheScreen();
  });

  it('disables continue while the terms are loading', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: true,
      error: null,
      retry: mockRetry,
    });

    const { getByTestId, queryByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeDisabled();
    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).not.toBeOnTheScreen();
  });

  it('shows a retry and keeps continue disabled when the terms fail to load', () => {
    mockUseKycSessionDisclaimers.mockReturnValue({
      disclaimers: null,
      isLoading: false,
      error: 'Request timed out',
      retry: mockRetry,
    });

    const { getByTestId } = renderScreen();

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_ERROR),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeDisabled();

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.DISCLAIMERS_RETRY),
    );
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('opens the data and privacy sheet with every provider document on continue', () => {
    const { getByTestId, getByText } = renderScreen();

    openTermsSheet(getByTestId);

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).toBeOnTheScreen();
    expect(getByText('Data and privacy')).toBeOnTheScreen();
    expect(
      getByText(
        'To verify your identity, your information will be shared securely with the providers below. Review their policies and terms before continuing.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('MetaMask Privacy Policy')).toBeOnTheScreen();
    expect(getByText('MetaMask Terms and Conditions')).toBeOnTheScreen();
    expect(getByText('idOS Privacy Policy')).toBeOnTheScreen();
    expect(getByText('Sumsub Terms and Conditions')).toBeOnTheScreen();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });

  it('opens MetaMask and catalog document URLs from the sheet', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK),
    );
    fireEvent.press(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK),
    );
    fireEvent.press(
      getByTestId(
        `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-idOS:idos-privacy`,
      ),
    );
    fireEvent.press(
      getByTestId(
        `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-kycProvider:sumsub-terms`,
      ),
    );

    expect(openUrlSpy.mock.calls).toEqual([
      [METAMASK_PRIVACY_POLICY_URL],
      [METAMASK_TERMS_URL],
      ['https://idos.example/privacy'],
      ['https://sumsub.example/terms'],
    ]);
  });

  it('closes the sheet and advances when the user agrees', () => {
    const { getByTestId, queryByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON));

    expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).not.toBeOnTheScreen();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('stays on the introduction when the sheet is dismissed without agreeing', () => {
    const { getByTestId, queryByTestId } = renderScreen();
    openTermsSheet(getByTestId);

    fireEvent.press(getByTestId(MOCK_SHEET_OVERLAY));

    expect(
      queryByTestId(VbaVerifyIdentitySelectorsIDs.TERMS_SHEET),
    ).not.toBeOnTheScreen();
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toBeOnTheScreen();
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
