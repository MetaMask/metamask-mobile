import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import React, { useState, useContext, useMemo } from 'react';
import { View, Switch, ActivityIndicator } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useStyles } from '../../../../hooks/useStyles';
import { usePerpsNetworkConfig, usePerpsNetwork } from '../../hooks';
import { PerpsTestnetToggleSelectorsIDs } from '../../Perps.testIds';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import styleSheet from '../../../../Views/Settings/DeveloperOptions/DeveloperOptions.styles';

export const PerpsTestnetToggle = () => {
  const { styles, theme } = useStyles(styleSheet, {});

  const { toggleTestnet } = usePerpsNetworkConfig();
  const currentNetwork = usePerpsNetwork();

  const isTestnetEnabled = useMemo(
    () => currentNetwork === 'testnet',
    [currentNetwork],
  );

  const [isLoading, setIsLoading] = useState(false);

  const { toastRef } = useContext(ToastContext);

  const handleTestnetToggle = async () => {
    setIsLoading(true);

    const toggleResult = await toggleTestnet();

    setIsLoading(false);

    if (toggleResult.success) {
      return;
    }

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Warning,
      iconColor: IconColor.Error,
      labelOptions: [
        {
          label: strings('perps.errors.failed_to_toggle_network'),
        },
      ],
      hasNoTimeout: false,
    });
  };

  return (
    <View style={styles.row} testID={PerpsTestnetToggleSelectorsIDs.ROOT}>
      <View style={styles.rowContent}>
        <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
          {strings('perps.developer_options.hyperliquid_network_toggle')}
        </Text>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary.default}
            testID={PerpsTestnetToggleSelectorsIDs.LOADING_INDICATOR}
            style={styles.rowValue}
          />
        ) : (
          <Text
            color={TextColor.TextAlternative}
            variant={TextVariant.BodySm}
            style={styles.rowValue}
          >
            {isTestnetEnabled
              ? strings('perps.testnet')
              : strings('perps.mainnet')}
          </Text>
        )}
      </View>
      <Switch
        value={isTestnetEnabled}
        onValueChange={handleTestnetToggle}
        testID={PerpsTestnetToggleSelectorsIDs.SWITCH}
      />
    </View>
  );
};
