import React, { useState, useMemo } from 'react';
import { View, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { usePerpsNetworkConfig, usePerpsNetwork } from '../../hooks';
import { PerpsTestnetToggleSelectorsIDs } from '../../Perps.testIds';
import {
  Text,
  TextColor,
  TextVariant,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';

const PerpsTestnetToggleStyles = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
  });

export const PerpsTestnetToggle = () => {
  const { styles, theme } = useStyles(PerpsTestnetToggleStyles, {});

  const { toggleTestnet } = usePerpsNetworkConfig();
  const currentNetwork = usePerpsNetwork();

  const isTestnetEnabled = useMemo(
    () => currentNetwork === 'testnet',
    [currentNetwork],
  );

  const [isLoading, setIsLoading] = useState(false);

  const handleTestnetToggle = async () => {
    setIsLoading(true);

    const toggleResult = await toggleTestnet();

    setIsLoading(false);

    if (toggleResult.success) {
      return;
    }

    toast({
      title: strings('perps.errors.failed_to_toggle_network'),
      severity: ToastSeverity.Danger,
      hasNoTimeout: false,
    });
  };

  return (
    <View style={styles.container} testID={PerpsTestnetToggleSelectorsIDs.ROOT}>
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
        {strings('perps.developer_options.hyperliquid_network_toggle')}
      </Text>
      <Switch
        value={isTestnetEnabled}
        onValueChange={handleTestnetToggle}
        testID={PerpsTestnetToggleSelectorsIDs.SWITCH}
      />
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={theme.colors.primary.default}
          testID={PerpsTestnetToggleSelectorsIDs.LOADING_INDICATOR}
        />
      ) : (
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
          {isTestnetEnabled
            ? strings('perps.testnet')
            : strings('perps.mainnet')}
        </Text>
      )}
    </View>
  );
};
