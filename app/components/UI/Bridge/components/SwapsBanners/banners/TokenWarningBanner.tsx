import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  BannerBase,
  Icon,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import {
  getBridgeTokenSecurityConfig,
  isNegativeSecurityType,
} from '../../../utils/tokenSecurityUtils';
import { SecurityDataType } from '../../../types';
import { TokenWarningModalMode } from '../../TokenWarningModal/constants';
import {
  ERROR_BANNER_TW_CLASSNAME,
  WARNING_BANNER_TW_CLASSNAME,
} from '../SwapsBanners.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { useSwapsBannersContext } from '../SwapsBannersContext';

/**
 * Flags a destination token the security provider considers suspicious or
 * malicious, and opens the warning modal with the details.
 */
export const TokenWarningBanner = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { destToken, location } = useSwapsBannersContext();

  const securityData = destToken?.securityData;
  const tokenWarning = useMemo(
    () =>
      securityData && isNegativeSecurityType(securityData.type)
        ? // Spread to keep the narrowed warning type the modal params expect.
          { ...securityData, type: securityData.type }
        : undefined,
    [securityData],
  );

  if (!tokenWarning) {
    return null;
  }

  const securityConfig = getBridgeTokenSecurityConfig(tokenWarning.type);
  const isMalicious = tokenWarning.type === SecurityDataType.Malicious;

  const openWarningModal = () =>
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.TOKEN_WARNING_MODAL,
      params: {
        warningType: tokenWarning.type,
        features: tokenWarning.metadata?.features ?? [],
        mode: TokenWarningModalMode.Info,
        location,
      },
    });

  return (
    <Pressable
      onPress={openWarningModal}
      testID={SwapsBannersSelectorsIDs.TOKEN_WARNING}
    >
      <BannerBase
        twClassName={
          isMalicious ? ERROR_BANNER_TW_CLASSNAME : WARNING_BANNER_TW_CLASSNAME
        }
        startAccessory={
          <Icon
            name={securityConfig.iconName}
            color={securityConfig.iconColor}
            size={IconSize.Lg}
          />
        }
        description={
          isMalicious
            ? strings('bridge.token_warning_malicious_banner', {
                token: destToken?.symbol,
              })
            : strings('bridge.token_warning_suspicious_banner', {
                token: destToken?.symbol,
              })
        }
        onClose={openWarningModal}
      />
    </Pressable>
  );
};
