import React from 'react';
import { Switch } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import { useTheme } from '../../../../../../util/theme';

export interface AllowPushNotificationsRowProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  testID?: string;
  toggleTestID?: string;
}

const AllowPushNotificationsRow: React.FC<AllowPushNotificationsRowProps> = ({
  title,
  description,
  value,
  onValueChange,
  disabled,
  testID,
  toggleTestID,
}) => {
  const { colors, brandColors } = useTheme();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName={`px-4 py-4${disabled ? ' opacity-50' : ''}`}
      testID={testID}
    >
      <Box twClassName="flex-1 mr-3">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {title}
        </Text>
        {description ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mt-0.5"
          >
            {description}
          </Text>
        ) : null}
      </Box>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={brandColors.white}
        ios_backgroundColor={colors.border.muted}
        testID={toggleTestID}
      />
    </Box>
  );
};

export default AllowPushNotificationsRow;
