import React from 'react';
import { fireEvent, within } from '@testing-library/react-native';
import type { KycDataShare, KycSessionStatus } from '@metamask/kyc-controller';
import IdentityVerification from './IdentityVerification';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { CommonSelectorsIDs } from '../../../../util/Common.testIds';
import { strings } from '../../../../../locales/i18n';
import { formatTimestampToDateTime } from '../../../../util/date';
import { IdentityVerificationSelectorsIDs } from './IdentityVerification.testIds';
import { useIdentityDataShares } from './useIdentityDataShares';

const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: jest.fn(), goBack: mockGoBack }),
}));

jest.mock('./useIdentityDataShares', () => ({
  useIdentityDataShares: jest.fn(),
}));

const mockUseIdentityDataShares = jest.mocked(useIdentityDataShares);

const MOONPAY_SHARE: KycDataShare = {
  kycSessionId: '123e4567-e89b-12d3-a456-426614174000',
  vendor: 'moonpay',
  sharedAt: '2026-09-17T11:23:00.000Z',
};

const sessionStatus = (finalStatus: string): KycSessionStatus =>
  ({
    id: 'session-1',
    finalStatus,
    externalUserId: 'external-user-1',
    kycStatus: finalStatus,
    vendor: 'moonpay',
    vendorStatus: 'approved',
  }) as KycSessionStatus;

const renderScreen = (finalStatus: string | null = 'approved') =>
  renderWithProvider(<IdentityVerification />, {
    state: {
      engine: {
        backgroundState: {
          ...backgroundState,
          KycController: {
            sessionStatus: finalStatus ? sessionStatus(finalStatus) : null,
          },
        },
      },
    },
  });

describe('IdentityVerification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseIdentityDataShares.mockReturnValue({
      shares: [MOONPAY_SHARE],
      isLoading: false,
    });
  });

  it('renders the screen header', () => {
    const { getByTestId } = renderScreen();

    const header = getByTestId(IdentityVerificationSelectorsIDs.HEADER);
    expect(
      within(header).getByText(strings('identity_verification.title')),
    ).toBeOnTheScreen();
  });

  it('navigates back when the back button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(CommonSelectorsIDs.BACK_ARROW_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('shows the verified headline for an approved session', () => {
    const { getByText } = renderScreen('approved');

    expect(
      getByText(strings('identity_verification.status_verified')),
    ).toBeOnTheScreen();
  });

  it('shows the not-verified headline for a rejected session', () => {
    const { getByText } = renderScreen('rejected');

    expect(
      getByText(strings('identity_verification.status_not_verified')),
    ).toBeOnTheScreen();
  });

  it('shows the in-progress headline for a pending session', () => {
    const { getByText } = renderScreen('pending');

    expect(
      getByText(strings('identity_verification.status_in_progress')),
    ).toBeOnTheScreen();
  });

  it('lists each vendor the identity data was shared with, and when', () => {
    const { getByTestId, getByText } = renderScreen();

    expect(
      getByTestId(`${IdentityVerificationSelectorsIDs.SHARE_ROW}-moonpay`),
    ).toBeOnTheScreen();
    expect(getByText('MoonPay')).toBeOnTheScreen();
    expect(
      getByText(
        strings('identity_verification.shared_on', {
          date: formatTimestampToDateTime(Date.parse(MOONPAY_SHARE.sharedAt)),
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('hides the shared-with section when nothing has been shared', () => {
    mockUseIdentityDataShares.mockReturnValue({
      shares: [],
      isLoading: false,
    });

    const { queryByTestId } = renderScreen();

    expect(
      queryByTestId(IdentityVerificationSelectorsIDs.SHARED_WITH_HEADING),
    ).toBeNull();
  });

  it('renders the delete identity data button', () => {
    const { getByTestId } = renderScreen();

    expect(
      getByTestId(IdentityVerificationSelectorsIDs.DELETE_BUTTON),
    ).toBeOnTheScreen();
  });
});
