import React, { useCallback } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import {
  BannerBase,
  ButtonSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import { useDestAssetRequireActivate } from '../../../hooks/useDestAssetRequireActivate';
import { useRecipientDisplayData } from '../../../hooks/useRecipientDisplayData/useRecipientDisplayData';
import { WARNING_BANNER_TW_CLASSNAME } from '../SwapsBanners.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { useSwapsBannersContext } from '../SwapsBannersContext';

/**
 * Non-blocking warning when a cross-chain swap destination is a Stellar classic
 * asset that still needs trustline activation on the destination account.
 * Same as active account → Activate CTA. Different dest → no CTA + switch copy.
 */
export const StellarTrustlineBanner = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { destToken } = useSwapsBannersContext();
  const { isDestAssetRequireActivate, isDestSameAsActiveAccount } =
    useDestAssetRequireActivate();
  const { destinationDisplayName } = useRecipientDisplayData();

  const handleActivatePress = useCallback(() => {
    if (!destToken) {
      return;
    }

    // Use push so we always open details for the destination token.
    // navigate('Asset') can reuse an existing Asset route with stale params.
    navigation.dispatch(
      StackActions.push('Asset', {
        ...destToken,
        source: TokenDetailsSource.Swap,
      }),
    );
  }, [destToken, navigation]);

  if (!isDestAssetRequireActivate || !destToken) {
    return null;
  }

  const description = isDestSameAsActiveAccount
    ? strings('bridge.stellar_trustline_warning_message', {
        token: destToken.symbol,
      })
    : strings('bridge.stellar_trustline_warning_message_different_account', {
        account: destinationDisplayName ?? '',
        token: destToken.symbol,
      });

  const bannerProps = {
    testID: SwapsBannersSelectorsIDs.STELLAR_TRUSTLINE,
    twClassName: WARNING_BANNER_TW_CLASSNAME,
    startAccessory: (
      <Icon
        name={IconName.Warning}
        color={IconColor.WarningDefault}
        size={IconSize.Lg}
      />
    ),
    title: strings('bridge.stellar_trustline_warning_title', {
      token: destToken.symbol,
    }),
    description,
  };

  if (isDestSameAsActiveAccount) {
    return (
      <BannerBase
        {...bannerProps}
        actionButtonLabel={strings('bridge.stellar_trustline_warning_cta', {
          token: destToken.symbol,
        })}
        actionButtonOnPress={handleActivatePress}
        actionButtonProps={{
          size: ButtonSize.Sm,
          twClassName: 'mt-1.5',
        }}
      />
    );
  }

  return <BannerBase {...bannerProps} />;
};
