import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import React, { useState, useContext, useMemo } from 'react';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { View, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useStyles } from '../../../../hooks/useStyles';
import { usePerpsNetworkConfig, usePerpsNetwork } from '../../hooks';
import { PerpsTestnetToggleSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

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
    <View style={styles.container} testID={PerpsTestnetToggleSelectorsIDs.ROOT}>
      <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
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
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
          {isTestnetEnabled
            ? strings('perps.testnet')
            : strings('perps.mainnet')}
        </Text>
      )}
    </View>
  );
};
