import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import React, { useState, useContext, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { View, Switch, ActivityIndicator } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { useStyles } from '../../../../hooks/useStyles';
import { usePerpsNetworkConfig } from '../../hooks';
import { selectPerpsProvider } from '../../selectors/perpsController';
import { PerpsProviderToggleSelectorsIDs } from '../../Perps.testIds';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import styleSheet from '../../../../Views/Settings/DeveloperOptions/DeveloperOptions.styles';

const PerpsProviderToggleContent = () => {
  const { styles, theme } = useStyles(styleSheet, {});

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

    try {
      const nextProvider = isAggregated ? 'hyperliquid' : 'aggregated';
      const result = await switchProvider(nextProvider);

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
    } finally {
      setIsLoading(false);
    }
  }, [currentProvider, isAggregated, switchProvider, toastRef]);

  if (!currentProvider) {
    return null;
  }

  return (
    <View style={styles.row} testID={PerpsProviderToggleSelectorsIDs.ROOT}>
      <View style={styles.rowContent}>
        <Text color={TextColor.TextDefault} variant={TextVariant.BodyMd}>
          {strings('perps.developer_options.provider_mode_toggle')}
        </Text>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary.default}
            testID={PerpsProviderToggleSelectorsIDs.LOADING_INDICATOR}
            style={styles.rowValue}
          />
        ) : (
          <Text
            color={TextColor.TextAlternative}
            variant={TextVariant.BodySm}
            style={styles.rowValue}
          >
            {currentProvider}
          </Text>
        )}
      </View>
      <Switch
        value={isAggregated}
        onValueChange={handleProviderToggle}
        disabled={isLoading}
        testID={PerpsProviderToggleSelectorsIDs.SWITCH}
      />
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
