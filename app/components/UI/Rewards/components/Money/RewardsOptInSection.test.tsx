import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReferralLocalizedText } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import RewardsOptInSection, {
  REWARDS_OPT_IN_SECTION_TEST_IDS,
} from './RewardsOptInSection';

let mockAccountGroupAccounts = [{ address: '0xsoftware', type: 'eip155:eoa' }];
let mockOptinAllowedForGeo: boolean | null = true;
let mockOptinAllowedForGeoLoading = false;
let mockOptinAllowedForGeoError = false;
let mockOptinError: string | null = null;
let mockOptinLoading = false;
const mockOptin = jest.fn();
const mockClearOptinError = jest.fn();
const mockShowToast = jest.fn();
const mockErrorToast = jest.fn((title: string, description?: string) => ({
  title,
  description,
}));
const mockIsOptInSupported = jest.fn(() => true);

jest.mock('react-redux', () => ({
  useSelector: (selector: () => unknown) => selector(),
}));

jest.mock('../../../../../reducers/rewards/selectors', () => ({
  selectOptinAllowedForGeo: () => mockOptinAllowedForGeo,
  selectOptinAllowedForGeoLoading: () => mockOptinAllowedForGeoLoading,
  selectOptinAllowedForGeoError: () => mockOptinAllowedForGeoError,
}));

jest.mock(
  '../../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: () => mockAccountGroupAccounts,
  }),
);

jest.mock('../../../../../util/address', () => ({
  isHardwareAccount: (address: string) => address === '0xhardware',
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    call: () => mockIsOptInSupported(),
  },
}));

jest.mock('../../hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: jest.fn(),
}));

jest.mock('../../hooks/useOptIn', () => ({
  __esModule: true,
  default: () => ({
    optin: mockOptin,
    optinError: mockOptinError,
    optinLoading: mockOptinLoading,
    clearOptinError: mockClearOptinError,
  }),
}));

jest.mock('../../hooks/useRewardsToast', () => ({
  __esModule: true,
  default: () => ({
    showToast: mockShowToast,
    RewardsToastOptions: { error: mockErrorToast },
  }),
}));

const LOCALIZED_TEXT = {
  invitedOptInDescription: 'Opt in to Rewards to start earning.',
  invitedOptInAction: 'Opt in to Rewards',
  invitedOptInLegal: 'Rewards terms apply.',
} as unknown as ReferralLocalizedText;

describe('RewardsOptInSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAccountGroupAccounts = [{ address: '0xsoftware', type: 'eip155:eoa' }];
    mockOptinAllowedForGeo = true;
    mockOptinAllowedForGeoLoading = false;
    mockOptinAllowedForGeoError = false;
    mockOptinError = null;
    mockOptinLoading = false;
    mockIsOptInSupported.mockReturnValue(true);
  });

  it('exposes an accessible CTA and opts in without navigation', () => {
    const { getByTestId, getByText } = render(
      <RewardsOptInSection localizedText={LOCALIZED_TEXT} />,
    );

    fireEvent.press(getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION));

    expect(mockOptin).toHaveBeenCalledWith({ bulkLink: true });
    expect(getByText('Rewards terms apply.')).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION).props
        .accessibilityState?.disabled ?? false,
    ).toBe(false);
  });

  it('disables the CTA and explains when the region is unsupported', () => {
    mockOptinAllowedForGeo = false;

    const { getByTestId, getByText, queryByText } = render(
      <RewardsOptInSection localizedText={LOCALIZED_TEXT} />,
    );

    fireEvent.press(getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION));

    expect(mockOptin).not.toHaveBeenCalled();
    expect(
      getByText(
        'Rewards are not supported in your region yet. We are working on expanding access, so check back later.',
      ),
    ).toBeOnTheScreen();
    expect(getByText('Opt in to Rewards to start earning.')).toBeOnTheScreen();
    expect(queryByText('Rewards terms apply.')).not.toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('disables the CTA and explains when geo eligibility cannot be checked', () => {
    mockOptinAllowedForGeo = null;
    mockOptinAllowedForGeoError = true;

    const { getByTestId, getByText, queryByText } = render(
      <RewardsOptInSection localizedText={LOCALIZED_TEXT} />,
    );

    expect(
      getByText(
        'We cannot determine if your region allows enrolling into the rewards program. Please check your connection and try again.',
      ),
    ).toBeOnTheScreen();
    expect(queryByText('Rewards terms apply.')).not.toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('disables the CTA and explains when the group has a hardware account', () => {
    mockAccountGroupAccounts = [{ address: '0xhardware', type: 'eip155:eoa' }];

    const { getByTestId, getByText } = render(
      <RewardsOptInSection localizedText={LOCALIZED_TEXT} />,
    );

    expect(
      getByText(
        'Hardware wallet accounts are not eligible to receive rewards yet. Please switch to a different account to proceed.',
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('disables the CTA and explains when no account type is supported', () => {
    mockIsOptInSupported.mockReturnValue(false);

    const { getByTestId, getByText } = render(
      <RewardsOptInSection localizedText={LOCALIZED_TEXT} />,
    );

    expect(
      getByText(
        'Currently only internal Ethereum and Solana accounts can be enrolled in the Rewards program. Please switch to a different account to proceed.',
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(REWARDS_OPT_IN_SECTION_TEST_IDS.ACTION).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('shows an opt-in failure as a toast without rendering a modal', () => {
    mockOptinError = 'Opt-in failed';

    render(<RewardsOptInSection localizedText={LOCALIZED_TEXT} />);

    expect(mockErrorToast).toHaveBeenCalledWith(
      'Opt-in failed',
      'Check your connection and try again.',
    );
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockClearOptinError).toHaveBeenCalled();
  });
});
