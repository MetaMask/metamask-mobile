import { useCallback, useContext } from 'react';
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
import { useMyProfile } from '../MyProfileView/hooks';
import { resolveSocialPostComposerWallet } from '../navigation/resolveSocialPostComposerWallet';

export interface UseOpenSocialPostComposerResult {
  openComposer: () => void;
}

/**
 * Opens the Social post composer scoped to the onboarding-linked wallet.
 * Does not change the globally selected account.
 */
export const useOpenSocialPostComposer =
  (): UseOpenSocialPostComposerResult => {
    const navigation = useNavigation<AppNavigationProp>();
    const { profile } = useMyProfile();
    const { toastRef } = useContext(ToastContext);
    const { colors } = useTheme();
    const internalAccounts = useSelector(selectInternalAccounts);
    const selectedGroupAccounts = useSelector(
      selectSelectedAccountGroupInternalAccounts,
    );

    const openComposer = useCallback(() => {
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

      navigation.navigate(Routes.SOCIAL.POST_COMPOSER);
    }, [
      colors.error.default,
      colors.primary.default,
      internalAccounts,
      navigation,
      profile?.linkedAccountAddress,
      profile?.linkedAccountId,
      selectedGroupAccounts,
      toastRef,
    ]);

    return { openComposer };
  };

export default useOpenSocialPostComposer;
