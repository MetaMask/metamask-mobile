import React, { useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { View, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../hooks/useStyles';
import { usePerpsNetworkConfig } from '../../hooks';
import { selectPerpsProvider } from '../../selectors/perpsController';
import { PerpsProviderToggleSelectorsIDs } from '../../Perps.testIds';
import {
  Text,
  TextColor,
  TextVariant,
  toast,
  ToastSeverity,
} from '@metamask/design-system-react-native';

const PerpsProviderToggleStyles = () =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
  });

const PerpsProviderToggleContent = () => {
  const { styles, theme } = useStyles(PerpsProviderToggleStyles, {});

  const { switchProvider } = usePerpsNetworkConfig();
  const currentProvider = useSelector(selectPerpsProvider);

  const isAggregated = useMemo(
    () => currentProvider === 'aggregated',
    [currentProvider],
  );

  const [isLoading, setIsLoading] = useState(false);

  const handleProviderToggle = useCallback(async () => {
    if (!currentProvider) return;

    setIsLoading(true);

    try {
      const nextProvider = isAggregated ? 'hyperliquid' : 'aggregated';
      const result = await switchProvider(nextProvider);

      if (result.success) {
        return;
      }

      toast({
        title: strings('perps.errors.failed_to_switch_provider'),
        severity: ToastSeverity.Danger,
        hasNoTimeout: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentProvider, isAggregated, switchProvider]);

  if (!currentProvider) {
    return null;
  }

  return (
    <View
      style={styles.container}
      testID={PerpsProviderToggleSelectorsIDs.ROOT}
    >
      <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
        {strings('perps.developer_options.provider_mode_toggle')}
      </Text>
      <Switch
        value={isAggregated}
        onValueChange={handleProviderToggle}
        disabled={isLoading}
        testID={PerpsProviderToggleSelectorsIDs.SWITCH}
      />
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={theme.colors.primary.default}
          testID={PerpsProviderToggleSelectorsIDs.LOADING_INDICATOR}
        />
      ) : (
        <Text color={TextColor.TextAlternative} variant={TextVariant.BodyMd}>
          {currentProvider}
        </Text>
      )}
    </View>
  );
};

export const PerpsProviderToggle = () => {
  // Only render in development mode
  if (!__DEV__) {
    return null;
  }

  return <PerpsProviderToggleContent />;
};
