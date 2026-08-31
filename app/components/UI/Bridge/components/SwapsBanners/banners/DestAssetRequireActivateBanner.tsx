import React, { useCallback, useMemo } from 'react';
import { StackActions, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  BannerBase,
  ButtonSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { isCaipChainId } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../../../selectors/networkController';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import { useDestAssetRequireActivate } from '../../../hooks/useDestAssetRequireActivate';
import { useRecipientDisplayData } from '../../../hooks/useRecipientDisplayData/useRecipientDisplayData';
import { WARNING_BANNER_TW_CLASSNAME } from '../SwapsBanners.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { useSwapsBannersContext } from '../SwapsBannersContext';

/**
 * Non-blocking warning when a cross-chain swap destination asset still needs
 * activation on the destination account (e.g. Stellar trustline, Ripple trust).
 * Same as active account → Activate CTA. Different dest → no CTA + switch copy.
 */
export const DestAssetRequireActivateBanner = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { destToken } = useSwapsBannersContext();
  const { isDestAssetRequireActivate, isDestSameAsActiveAccount } =
    useDestAssetRequireActivate();
  const { destinationDisplayName } = useRecipientDisplayData();
  const networkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const networkName = useMemo(() => {
    if (!destToken?.chainId) {
      return '';
    }
    const caipChainId = isCaipChainId(destToken.chainId)
      ? destToken.chainId
      : formatChainIdToCaip(destToken.chainId);
    return networkConfigurations[caipChainId]?.name ?? caipChainId;
  }, [destToken?.chainId, networkConfigurations]);

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
    ? strings('bridge.dest_asset_require_activate_warning_message', {
        network: networkName,
        token: destToken.symbol,
      })
    : strings(
        'bridge.dest_asset_require_activate_warning_message_different_account',
        {
          network: networkName,
          account: destinationDisplayName ?? '',
          token: destToken.symbol,
        },
      );

  const bannerProps = {
    testID: SwapsBannersSelectorsIDs.DEST_ASSET_REQUIRE_ACTIVATE,
    twClassName: WARNING_BANNER_TW_CLASSNAME,
    startAccessory: (
      <Icon
        name={IconName.Warning}
        color={IconColor.WarningDefault}
        size={IconSize.Lg}
      />
    ),
    title: strings('bridge.dest_asset_require_activate_warning_title', {
      network: networkName,
      token: destToken.symbol,
    }),
    description,
  };

  if (isDestSameAsActiveAccount) {
    return (
      <BannerBase
        {...bannerProps}
        actionButtonLabel={strings(
          'bridge.dest_asset_require_activate_warning_cta',
          {
            token: destToken.symbol,
          },
        )}
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
