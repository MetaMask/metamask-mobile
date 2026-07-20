import React from 'react';
import { Linking } from 'react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { strings } from '../../../../../../../locales/i18n';
import DiscoveryErrorScreenLayout from './DiscoveryErrorScreenLayout';
import type {
  DiscoveryErrorButtonConfig,
  DiscoveryErrorScreenActionProps,
} from './DiscoveryErrorScreen.types';
import {
  getDiscoveryErrorScreenConfig,
  type DiscoveryErrorScreenButtonConfig,
  type DiscoveryErrorScreenVariant,
} from './discoveryErrorScreenConfigs';

interface DiscoveryErrorScreenProps extends DiscoveryErrorScreenActionProps {
  variant: DiscoveryErrorScreenVariant;
  walletType?: HardwareWalletType;
}

const BUTTON_LABEL_KEYS: Record<
  DiscoveryErrorScreenButtonConfig['role'],
  string
> = {
  retry: 'ledger.try_again',
  'open-settings': 'ledger.open_settings',
  'not-now': 'ledger.not_now',
  continue: 'hardware_wallet.error.continue',
};

const resolveButton = (
  button: DiscoveryErrorScreenButtonConfig | undefined,
  actions: DiscoveryErrorScreenActionProps,
): DiscoveryErrorButtonConfig | undefined => {
  if (!button) {
    return undefined;
  }

  const label = strings(button.labelKey ?? BUTTON_LABEL_KEYS[button.role]);

  switch (button.role) {
    case 'open-settings':
      return {
        label,
        onPress: () => Linking.openSettings(),
        testID: button.testID,
      };
    case 'retry':
      return actions.onRetry
        ? {
            label,
            onPress: actions.onRetry,
            testID: button.testID,
          }
        : undefined;
    case 'not-now':
      return actions.onNotNow
        ? {
            label,
            onPress: actions.onNotNow,
            testID: button.testID,
          }
        : undefined;
    case 'continue':
      return actions.onContinue
        ? {
            label,
            onPress: actions.onContinue,
            testID: button.testID,
          }
        : undefined;
    default:
      return undefined;
  }
};

const DiscoveryErrorScreen = ({
  variant,
  onRetry,
  onNotNow,
  onContinue,
  walletType = HardwareWalletType.Ledger,
}: DiscoveryErrorScreenProps) => {
  const config = getDiscoveryErrorScreenConfig(variant);
  const actions = { onRetry, onNotNow, onContinue };
  const subtitleParams = config.getSubtitleParams?.(walletType);

  return (
    <DiscoveryErrorScreenLayout
      imageSource={config.imageSource}
      artboardName={config.rive?.artboardName}
      stateMachineName={config.rive?.stateMachineName}
      stateTrigger={config.rive?.stateTrigger}
      title={strings(config.titleKey)}
      subtitle={
        subtitleParams
          ? strings(config.subtitleKey, subtitleParams)
          : strings(config.subtitleKey)
      }
      primaryButton={resolveButton(config.primaryButton, actions)}
      secondaryButton={resolveButton(config.secondaryButton, actions)}
      testID={config.testID}
    />
  );
};

export default DiscoveryErrorScreen;
