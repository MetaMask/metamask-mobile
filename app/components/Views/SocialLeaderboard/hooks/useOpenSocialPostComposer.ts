import { useCallback, useContext } from 'react';
import type { Position } from '@metamask/social-controllers';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import Routes from '../../../../constants/navigation/Routes';
import { selectInternalAccounts } from '../../../../selectors/accountsController';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { useTheme } from '../../../../util/theme';
import {
  SocialEvent,
  useTrackSocialActionBlocked,
  type SocialEventSource,
} from '../analytics';
import { setPendingOnboardingTrigger } from '../ProfileOnboarding/pendingOnboardingTrigger';
import { useMyProfile } from '../MyProfileView/hooks';
import { resolveSocialPostComposerWallet } from '../navigation/resolveSocialPostComposerWallet';
import type {
  SocialPostComposerBlankEntry,
  SocialPostComposerEntryPoint,
} from '../SocialPostComposerView/SocialPostComposerView.types';

/** Share context when a host screen opens the composer with a position. */
export interface OpenComposerPositionOptions {
  /** Pre-attach this position instead of opening the position picker. */
  position: Position;
  /** Where the share was started from. */
  entryPoint: SocialPostComposerEntryPoint;
}

/** A blank composer opened from a post button. */
export interface OpenComposerBlankOptions {
  composerEntry: SocialPostComposerBlankEntry;
  /** Surface that opened the composer, sent as the `source` of its screen view. */
  analyticsSource?: SocialEventSource;
}

export type OpenComposerOptions =
  | OpenComposerPositionOptions
  | OpenComposerBlankOptions;

export interface UseOpenSocialPostComposerResult {
  openComposer: (options?: OpenComposerOptions) => void;
}

/**
 * Opens the Social post composer scoped to the onboarding-linked wallet.
 * Does not change the globally selected account.
 */
export const useOpenSocialPostComposer =
  (): UseOpenSocialPostComposerResult => {
    const navigation = useNavigation<AppNavigationProp>();
    const onBlocked = useTrackSocialActionBlocked(
      SocialEvent.Screen.POST_COMPOSER,
    );
    const { profile } = useMyProfile();
    const { toastRef } = useContext(ToastContext);
    const { colors } = useTheme();
    const internalAccounts = useSelector(selectInternalAccounts);
    const selectedGroupAccounts = useSelector(
      selectSelectedAccountGroupInternalAccounts,
    );

    // prettier-ignore
    const openComposer = useCallback((options?: OpenComposerOptions) => {
      const result = resolveSocialPostComposerWallet({
        linkedAccountId: profile?.linkedAccountId,
        linkedAccountAddress: profile?.linkedAccountAddress,
        internalAccounts: internalAccounts.map((account) => ({
          id: account.id,
          address: account.address,
          name: account.metadata.name,
        })),
        selectedGroupAccountIds: selectedGroupAccounts.map(
          (account) => account.id,
        ),
        selectedGroupAddresses: selectedGroupAccounts.map(
          (account) => account.address,
        ),
      });

      if (result.action === 'onboarding') {
        onBlocked?.({
          blocked_action: SocialEvent.OnboardingTrigger.POST_COMPOSER,
          blocked_reason: SocialEvent.BlockedReason.PROFILE_ONBOARDING,
          ...(options && 'composerEntry' in options
            ? { composer_entry: options.composerEntry }
            : {}),
        });
        setPendingOnboardingTrigger(SocialEvent.OnboardingTrigger.POST_COMPOSER);
        navigation.navigate(Routes.SOCIAL.PROFILE_ONBOARDING);
        return;
      }

      if (result.action === 'blocked') {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: ComponentLibraryIconName.Danger,
          iconColor: colors.error.default,
          labelOptions: [
            {
              label: strings(
                'social_leaderboard.composer.linked_account_missing',
              ),
            },
          ],
          hasNoTimeout: false,
        });
        return;
      }

      if (result.showLinkedAccountToast) {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: ComponentLibraryIconName.Info,
          iconColor: colors.primary.default,
          labelOptions: [
            {
              label: strings(
                'social_leaderboard.composer.showing_linked_account',
                { account: result.accountLabel },
              ),
            },
          ],
          hasNoTimeout: false,
        });
      }

      if (options) {
        navigation.navigate(Routes.SOCIAL.POST_COMPOSER, options);
        return;
      }
      navigation.navigate(Routes.SOCIAL.POST_COMPOSER);
    }, [
      colors.error.default,
      colors.primary.default,
      internalAccounts,
      navigation,
      onBlocked,
      profile?.linkedAccountAddress,
      profile?.linkedAccountId,
      selectedGroupAccounts,
      toastRef,
    ]);

    return { openComposer };
  };

export default useOpenSocialPostComposer;
