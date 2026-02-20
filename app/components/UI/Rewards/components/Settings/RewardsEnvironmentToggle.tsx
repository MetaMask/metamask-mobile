import React, { useCallback, useState } from 'react';
import { Switch } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { selectRewardsUseUatBackend } from '../../../../../selectors/rewards';
import Engine from '../../../../../core/Engine';

const isRcBuild = process.env.METAMASK_ENVIRONMENT === 'rc';

const RewardsEnvironmentToggle: React.FC = () => {
  const { colors } = useTheme();
  const persistedValue = useSelector(selectRewardsUseUatBackend);
  const [isEnabled, setIsEnabled] = useState(persistedValue);

  const handleToggle = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    Engine.controllerMessenger.call(
      'RewardsController:setUseUatBackend',
      enabled,
    );
  }, []);

  if (!isRcBuild) {
    return null;
  }

  return (
    <Box
      testID="rewards-environment-toggle"
      twClassName="gap-4 flex-col py-4 px-4 border-t border-muted"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Text variant={TextVariant.HeadingSm}>
          {strings('rewards.settings.uat_backend_toggle')}
        </Text>
        <Switch
          value={isEnabled}
          onValueChange={handleToggle}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
        />
      </Box>
    </Box>
  );
};

export default RewardsEnvironmentToggle;
