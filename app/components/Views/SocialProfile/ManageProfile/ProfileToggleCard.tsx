import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Switch,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../locales/i18n';
import { ManageProfileSelectorsIDs } from './ManageProfile.testIds';

interface ProfileToggleCardProps {
  /** Row label, e.g. "Show trading activity". */
  label: string;
  /** Secondary line describing what the current state means. */
  description: string;
  /** Copy rendered below the card, outside it. */
  helperText?: string;
  isOn: boolean;
  onValueChange: (isOn: boolean) => void;
}

/**
 * A privacy toggle card: label with info affordance, a description of the
 * current state, the switch, and helper copy underneath. Mirrors the layout of
 * `SocialLeaderboard/ManageProfileView`'s trading activity screen.
 */
const ProfileToggleCard = ({
  label,
  description,
  helperText,
  isOn,
  onValueChange,
}: ProfileToggleCardProps) => (
  <Box twClassName="px-4 pb-4 pt-2" gap={3}>
    <Box twClassName="rounded-2xl bg-muted px-4 py-3">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mr-3 flex-1"
          gap={1}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {label}
          </Text>
          <ButtonIcon
            iconName={IconName.Info}
            size={ButtonIconSize.Sm}
            onPress={() => undefined}
            accessibilityLabel={strings(
              'app_settings.manage_profile.trading_activity_info',
            )}
            testID={ManageProfileSelectorsIDs.TOGGLE_INFO_BUTTON}
          />
        </Box>
        <Switch
          isOn={isOn}
          onValueChange={onValueChange}
          accessibilityLabel={label}
          testID={ManageProfileSelectorsIDs.FIELD_SHEET_SWITCH}
        />
      </Box>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mt-1"
        testID={ManageProfileSelectorsIDs.TOGGLE_DESCRIPTION}
      >
        {description}
      </Text>
    </Box>
    {helperText ? (
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={ManageProfileSelectorsIDs.TOGGLE_HELPER_TEXT}
      >
        {helperText}
      </Text>
    ) : null}
  </Box>
);

export default ProfileToggleCard;
