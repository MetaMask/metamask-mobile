import React from 'react';
import { useSelector } from 'react-redux';
import {
  BannerAlert,
  BannerAlertSeverity,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { selectIsSolanaSourced } from '../../../../../../core/redux/slices/bridge';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../../util/address';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';

/**
 * Tells the user that hardware wallets cannot sign the Solana swap they set up.
 */
export const HardwareWalletSolanaSignUnsupportedBanner = () => {
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isSolanaSourced = useSelector(selectIsSolanaSourced);

  const isHardwareAddress = selectedAddress
    ? Boolean(isHardwareAccount(selectedAddress))
    : false;

  if (!isHardwareAddress || !isSolanaSourced) {
    return null;
  }

  return (
    <BannerAlert
      severity={BannerAlertSeverity.Danger}
      description={strings('bridge.hardware_wallet_not_supported_solana')}
      testID={SwapsBannersSelectorsIDs.HARDWARE_WALLET_UNSUPPORTED}
    />
  );
};
