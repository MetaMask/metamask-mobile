import Routes from '../../../../constants/navigation/Routes';
import type {
  AppNavigationProp,
  SocialV1ProfileViewParams,
} from '../../../../core/NavigationService/types';

export type NavigateToSocialV1ProfileParams = SocialV1ProfileViewParams & {
  viewerProfileId?: string;
  viewerAddress?: string;
};

const addressesMatch = (
  left: string | undefined,
  right: string | undefined,
): boolean =>
  Boolean(left && right && left.toLowerCase() === right.toLowerCase());

/**
 * Opens the Social V1 profile. Omits foreign identity params when the target
 * is the signed-in viewer so the screen stays in owner chrome.
 */
export const navigateToSocialV1Profile = (
  navigation: Pick<AppNavigationProp, 'navigate'>,
  params?: NavigateToSocialV1ProfileParams,
): void => {
  const isSelf =
    !params?.traderId ||
    params.traderId === params.viewerProfileId ||
    addressesMatch(params.traderAddress, params.viewerAddress);

  if (isSelf) {
    navigation.navigate(Routes.SOCIAL.V1_PROFILE, undefined, {});
    return;
  }

  navigation.navigate(
    Routes.SOCIAL.V1_PROFILE,
    {
      traderId: params.traderId,
      traderName: params.traderName,
      traderAddress: params.traderAddress,
      source: params.source,
      traderRank: params.traderRank,
    },
    {},
  );
};
