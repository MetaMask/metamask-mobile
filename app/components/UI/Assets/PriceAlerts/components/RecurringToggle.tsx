import React from 'react';
import { Switch } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { CreatePriceAlertTestIds } from '../constants';

interface RecurringToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
}

const RecurringToggle: React.FC<RecurringToggleProps> = ({
  value,
  onValueChange,
}) => {
  const { colors, brandColors } = useTheme();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="mb-3 px-2"
    >
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {strings('price_alerts.recurring')}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={brandColors.white}
        ios_backgroundColor={colors.border.muted}
        testID={CreatePriceAlertTestIds.RECURRING_TOGGLE}
      />
    </Box>
  );
};

export default RecurringToggle;
