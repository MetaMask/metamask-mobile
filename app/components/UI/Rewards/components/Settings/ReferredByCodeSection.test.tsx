import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  createMockEventBuilder,
  createMockUseAnalyticsHook,
} from '../../../../../util/test/analyticsMock';
import { useAcceptMoneyReferralCode } from '../../hooks/useAcceptMoneyReferralCode';
import { useGeoRewardsMetadata } from '../../hooks/useGeoRewardsMetadata';
import { useReferralMe } from '../../hooks/useReferralMe';
import { useValidateMoneyReferralCode } from '../../hooks/useValidateMoneyReferralCode';
import type { ReferralMeEntry } from '../../../../../reducers/rewardsMoney';
import {
  selectMoneyReferralAllowedForGeo,
  selectReferralMeEntry,
  selectSettingsReferralAvailable,
} from '../../../../../reducers/rewardsMoney/selectors';
import ReferredByCodeSection from './ReferredByCodeSection';

jest.mock('../../../../../reducers/rewardsMoney/selectors', () => ({
  selectReferralMeEntry: jest.fn(),
  selectMoneyReferralAllowedForGeo: jest.fn(),
  selectSettingsReferralAvailable: jest.fn(() => true),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../hooks/useReferralMe', () => ({
  useReferralMe: jest.fn(),
}));

jest.mock('../../hooks/useGeoRewardsMetadata', () => ({
  useGeoRewardsMetadata: jest.fn(),
}));

jest.mock('../../hooks/useValidateMoneyReferralCode', () => ({
  MONEY_REFERRAL_CODE_MAX_LENGTH: 24,
  MONEY_REFERRAL_CODE_MIN_LENGTH: 3,
  useValidateMoneyReferralCode: jest.fn(),
}));

jest.mock('../../hooks/useAcceptMoneyReferralCode', () => ({
  useAcceptMoneyReferralCode: jest.fn(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockFetchReferralMe = jest.fn().mockResolvedValue({ status: 'settled' });
const mockSetReferralCode = jest.fn();
const mockAcceptReferralCode = jest.fn();
const mockClearError = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

const openEntry = {
  loading: false,
  error: false,
  data: {
    referred_by: null,
    localized_text: {
      settingsReferralTitle: 'Referral Code',
      settingsReferralLinkedDescription:
        'Earn rewards for both you and your friend.',
      settingsReferralNotLinkedDescription:
        'Have a referral code? Enter it below and you will be linked.',
      settingsReferralPlaceholder: 'Enter referral code',
      settingsReferralApply: 'Apply',
    },
  },
} as ReferralMeEntry;

const renderSection = (
  props: React.ComponentProps<typeof ReferredByCodeSection> = {},
) => render(<ReferredByCodeSection {...props} />);

describe('ReferredByCodeSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    jest.mocked(useReferralMe).mockReturnValue({
      profileId: 'profile-1',
      fetchReferralMe: mockFetchReferralMe,
    });
    jest.mocked(useGeoRewardsMetadata).mockReturnValue({
      fetchGeoRewardsMetadata: jest.fn(),
    });
    jest.mocked(useValidateMoneyReferralCode).mockReturnValue({
      referralCode: '',
      setReferralCode: mockSetReferralCode,
      validateCode: jest.fn(),
      isValidating: false,
      isValid: false,
      isUnknownError: false,
    });
    mockAcceptReferralCode.mockResolvedValue({ accepted: true });
    jest.mocked(useAcceptMoneyReferralCode).mockReturnValue({
      acceptReferralCode: mockAcceptReferralCode,
      isLoading: false,
      errorMessage: '',
      refusalReason: null,
      acceptBlockedUntil: null,
      clearError: mockClearError,
    });
    jest.mocked(selectReferralMeEntry).mockReturnValue(openEntry);
    jest.mocked(selectMoneyReferralAllowedForGeo).mockReturnValue(true);
    jest.mocked(selectSettingsReferralAvailable).mockReturnValue(true);
  });

  it('renders nothing while referral me has not been cached', () => {
    jest.mocked(useReferralMe).mockReturnValue({
      profileId: undefined,
      fetchReferralMe: mockFetchReferralMe,
    });
    jest.mocked(selectReferralMeEntry).mockReturnValue(undefined);

    const { queryByTestId } = renderSection();

    expect(queryByTestId('referred-by-code-section-loading')).toBeNull();
    expect(queryByTestId('referred-by-code-section')).toBeNull();
    expect(queryByTestId('referred-by-code-input')).toBeNull();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('renders nothing when referral me has no cached payload', () => {
    jest.mocked(selectReferralMeEntry).mockReturnValue({
      loading: false,
      error: true,
      data: null,
    });

    const { queryByTestId } = renderSection();

    expect(queryByTestId('referred-by-code-section')).toBeNull();
    expect(queryByTestId('referred-by-code-section-loading')).toBeNull();
    expect(queryByTestId('referred-by-code-input')).toBeNull();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('renders nothing when the money referral is unavailable', () => {
    jest.mocked(selectSettingsReferralAvailable).mockReturnValue(false);

    const { queryByTestId } = renderSection();

    expect(queryByTestId('referred-by-code-section')).toBeNull();
    expect(queryByTestId('referred-by-code-input')).toBeNull();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('uppercases the typed code and drops separators', () => {
    const { getByTestId, getByText } = renderSection();

    expect(getByText('Referral Code')).toBeOnTheScreen();
    expect(
      getByText('Have a referral code? Enter it below and you will be linked.'),
    ).toBeOnTheScreen();
    expect(getByText('Apply')).toBeOnTheScreen();

    fireEvent.changeText(getByTestId('referred-by-code-input'), 'ab-12cd');

    expect(mockClearError).toHaveBeenCalled();
    expect(mockSetReferralCode).toHaveBeenCalledWith('AB12CD');
  });

  it('shows an invalid code the same way as the invite sheet', () => {
    jest.mocked(useValidateMoneyReferralCode).mockReturnValue({
      referralCode: 'ABC123',
      setReferralCode: mockSetReferralCode,
      validateCode: jest.fn(),
      isValidating: false,
      isValid: false,
      isUnknownError: false,
    });

    const { getByTestId } = renderSection();

    expect(getByTestId('referred-by-code-error')).toHaveTextContent(
      'rewards.error_messages.invalid_referral_code',
    );
    expect(getByTestId('referred-by-code-error')).toHaveProp(
      'accessibilityRole',
      'alert',
    );
    expect(getByTestId('referred-by-code-error')).toHaveProp(
      'accessibilityLiveRegion',
      'polite',
    );
    expect(getByTestId('referred-by-code-apply')).toBeDisabled();
  });

  it('shows an unknown validation failure', () => {
    jest.mocked(useValidateMoneyReferralCode).mockReturnValue({
      referralCode: 'ABC123',
      setReferralCode: mockSetReferralCode,
      validateCode: jest.fn(),
      isValidating: false,
      isValid: false,
      isUnknownError: true,
    });

    const { getByTestId } = renderSection();

    expect(getByTestId('referred-by-code-error')).toHaveTextContent(
      'rewards.error_messages.something_went_wrong',
    );
  });

  it('shows a geo block and disables apply', () => {
    jest.mocked(selectMoneyReferralAllowedForGeo).mockReturnValue(false);
    jest.mocked(useValidateMoneyReferralCode).mockReturnValue({
      referralCode: 'ABC123',
      setReferralCode: mockSetReferralCode,
      validateCode: jest.fn(),
      isValidating: false,
      isValid: true,
      isUnknownError: false,
    });

    const { getByTestId } = renderSection();

    expect(getByTestId('referred-by-code-error')).toHaveTextContent(
      'rewards.onboarding.not_supported_region_description',
    );
    expect(getByTestId('referred-by-code-apply')).toBeDisabled();
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('shows the register refusal from the accept hook', () => {
    jest.mocked(useValidateMoneyReferralCode).mockReturnValue({
      referralCode: 'ABC123',
      setReferralCode: mockSetReferralCode,
      validateCode: jest.fn(),
      isValidating: false,
      isValid: true,
      isUnknownError: false,
    });
    jest.mocked(useAcceptMoneyReferralCode).mockReturnValue({
      acceptReferralCode: mockAcceptReferralCode,
      isLoading: false,
      errorMessage: 'rewards.error_messages.referrer_cannot_be_referred',
      refusalReason: 'kol_cannot_register',
      acceptBlockedUntil: null,
      clearError: mockClearError,
    });

    const { getByTestId } = renderSection();

    expect(getByTestId('referred-by-code-error')).toHaveTextContent(
      'rewards.error_messages.referrer_cannot_be_referred',
    );
  });

  describe('analytics', () => {
    it('does not track viewed or declined when the offer is on screen', () => {
      renderSection();

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_MONEY_REFERRAL_OFFER_INTERACTED,
      );
    });

    it('tracks accepted only after apply succeeds', async () => {
      jest.mocked(useValidateMoneyReferralCode).mockReturnValue({
        referralCode: 'ABC123',
        setReferralCode: mockSetReferralCode,
        validateCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
      });

      const { getByTestId } = renderSection();
      fireEvent.press(getByTestId('referred-by-code-apply'));

      await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledTimes(1));
      const acceptedBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(acceptedBuilder.addProperties).toHaveBeenCalledWith({
        referral_code: 'ABC123',
        interaction_type: 'accepted',
      });
    });

    it('does not track a refused apply, and a later accept still tracks accepted', async () => {
      mockAcceptReferralCode
        .mockResolvedValueOnce({
          accepted: false,
          refusalReason: 'invalid_code',
        })
        .mockResolvedValueOnce({ accepted: true });
      jest.mocked(useValidateMoneyReferralCode).mockReturnValue({
        referralCode: 'ABC123',
        setReferralCode: mockSetReferralCode,
        validateCode: jest.fn(),
        isValidating: false,
        isValid: true,
        isUnknownError: false,
      });

      const { getByTestId } = renderSection();
      fireEvent.press(getByTestId('referred-by-code-apply'));

      await act(async () => {
        await mockAcceptReferralCode.mock.results[0]?.value;
      });
      expect(mockTrackEvent).not.toHaveBeenCalled();

      fireEvent.press(getByTestId('referred-by-code-apply'));

      await waitFor(() => expect(mockTrackEvent).toHaveBeenCalledTimes(1));
      const acceptedBuilder = mockCreateEventBuilder.mock.results[0]?.value;
      expect(acceptedBuilder.addProperties).toHaveBeenCalledWith({
        referral_code: 'ABC123',
        interaction_type: 'accepted',
      });
    });
  });
});
