import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { StackActions, useNavigation } from '@react-navigation/native';
import { isCrossChain } from '@metamask/bridge-controller';
import {
  BannerBase,
  ButtonSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { getIsAssetRequireActivate } from '../../../../../../selectors/stellar/stellar-assets';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import { WARNING_BANNER_TW_CLASSNAME } from '../SwapsBanners.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { useSwapsBannersContext } from '../SwapsBannersContext';

/**
 * Non-blocking warning when a cross-chain swap destination is a Stellar classic
 * asset that still needs trustline activation. CTA opens token details so the
 * user can activate the asset.
 */
export const StellarTrustlineBanner = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { sourceToken, destToken } = useSwapsBannersContext();

  const isDestAssetRequireActivate = useSelector((state) =>
    destToken?.address
      ? getIsAssetRequireActivate(state, { assetId: destToken.address })
      : false,
  );

  const shouldShow = Boolean(
    sourceToken &&
      destToken &&
      isCrossChain(sourceToken.chainId, destToken.chainId) &&
      isDestAssetRequireActivate,
  );

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

  if (!shouldShow || !destToken) {
    return null;
  }

  return (
    <BannerBase
      testID={SwapsBannersSelectorsIDs.STELLAR_TRUSTLINE}
      twClassName={WARNING_BANNER_TW_CLASSNAME}
      startAccessory={
        <Icon
          name={IconName.Warning}
          color={IconColor.WarningDefault}
          size={IconSize.Lg}
        />
      }
      title={strings('bridge.stellar_trustline_warning_title', {
        token: destToken.symbol,
      })}
      description={strings('bridge.stellar_trustline_warning_message', {
        token: destToken.symbol,
      })}
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
};
