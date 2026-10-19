import React from 'react';
import {
  BannerBase,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useIsHardwareWalletForBridge } from '../../../hooks/useIsHardwareWalletForBridge';
import { ERROR_BANNER_TW_CLASSNAME } from '../SwapsBanners.constants';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';

/**
 * Tells the user that hardware wallets cannot sign this order type on any chain.
 * Only compose this into order types that block hardware wallets outright (e.g.
 * limit orders); Market orders support them on EVM chains and use
 * `HardwareWalletSolanaSignUnsupportedBanner` for the Solana-only restriction.
 */
export const HardwareWalletUnsupportedBanner = () => {
  const isHardwareWallet = useIsHardwareWalletForBridge();

  if (!isHardwareWallet) {
    return null;
  }

  return (
    <BannerBase
      twClassName={ERROR_BANNER_TW_CLASSNAME}
      startAccessory={
        <Icon
          name={IconName.Error}
          color={IconColor.ErrorDefault}
          size={IconSize.Lg}
        />
      }
      description={
        <Text
          testID={
            SwapsBannersSelectorsIDs.HARDWARE_WALLET_ORDER_TYPE_UNSUPPORTED
          }
          variant={TextVariant.BodySm}
        >
          {strings('bridge.hardware_wallet_not_supported')}
        </Text>
      }
    />
  );
};
