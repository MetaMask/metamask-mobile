import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import React, { useState, useContext, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
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
import { usePerpsNetworkConfig } from '../../hooks';
import { selectPerpsProvider } from '../../selectors/perpsController';
import { PerpsProviderToggleSelectorsIDs } from '../../Perps.testIds';

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

  const { toastRef } = useContext(ToastContext);

  const handleProviderToggle = useCallback(async () => {
    if (!currentProvider) return;

    setIsLoading(true);

    const nextProvider = isAggregated ? 'hyperliquid' : 'aggregated';

    const result = await switchProvider(nextProvider);

    setIsLoading(false);

    if (result.success) {
      return;
    }

    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: IconName.Warning,
      iconColor: IconColor.Error,
      labelOptions: [
        {
          label: strings('perps.errors.failed_to_switch_provider'),
        },
      ],
      hasNoTimeout: false,
    });
  }, [currentProvider, isAggregated, switchProvider, toastRef]);

  if (!currentProvider) {
    return null;
  }

  return (
    <View
      style={styles.container}
      testID={PerpsProviderToggleSelectorsIDs.ROOT}
    >
      <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
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
        <Text color={TextColor.Alternative} variant={TextVariant.BodyMD}>
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
