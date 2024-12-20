import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { fontStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import ListItem from '../../../component-library/components/List/ListItem/ListItem';
import ListItemColumn, {
  WidthType,
} from '../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { Colors } from '../../../util/theme/models';
import { SettingsDrawerProps } from './index.types';

const isSettingsRedesignEnabled =
  process.env.MM_SETTINGS_REDESIGN_ENABLE === 'true';

const createStyles = (
  colors: Colors,
  { isFirst, isLast }: { isFirst: boolean; isLast: boolean },
) =>
  StyleSheet.create({
    root: {
      backgroundColor: isSettingsRedesignEnabled
        ? colors.background.alternative
        : colors.background.default,
      padding: 16,
      ...(isFirst && { borderTopLeftRadius: 8, borderTopRightRadius: 8 }),
      ...(!isFirst && {
        borderTopWidth: 1,
        borderTopColor: colors.primary.inverse,
      }),
      ...(isLast && { borderBottomLeftRadius: 8, borderBottomRightRadius: 8 }),
    },
    settingsCard: {
      alignItems: 'center',
      backgroundColor: colors.background.alternative,
      padding: 16,
    },
    action: {
      paddingLeft: 16,
    },
    warningTag: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      height: 24,
      paddingHorizontal: 8,
      marginTop: 8,
      borderRadius: 12,
      backgroundColor: colors.error.muted,
    },
    warningText: {
      marginLeft: 4,
    },
    menuItemWarningText: {
      color: colors.text.default,
      fontSize: 12,
      ...fontStyles.normal,
    },
    icon: {
      marginRight: 12,
    },
    separator: {
      borderTopWidth: 1,
      borderTopColor: colors.primary.inverse,
    },
  });

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  title,
  description,
  onPress,
  iconName,
  iconColor,
  warning,
  renderArrowRight = true,
  isFirst = false,
  isLast = false,
  testID,
  titleColor = TextColor.Default,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors, { isFirst, isLast });
  const titleVariant = isSettingsRedesignEnabled
    ? TextVariant.BodyMDMedium
    : TextVariant.BodyLGMedium;
  const descriptionVariant = isSettingsRedesignEnabled
    ? TextVariant.BodySM
    : TextVariant.BodyMD;

  return (
    <TouchableOpacity onPress={onPress} {...generateTestId(Platform, testID)}>
      <ListItem style={styles.root} gap={16}>
        {iconName && isSettingsRedesignEnabled && (
          <Icon
            name={iconName}
            size={IconSize.Md}
            color={iconColor || colors.text.default}
          />
        )}
        <ListItemColumn widthType={WidthType.Fill}>
          <Text variant={titleVariant} color={titleColor}>
            {title}
          </Text>
          {description && (
            <Text variant={descriptionVariant} color={TextColor.Alternative}>
              {description}
            </Text>
          )}
          {warning && (
            <View style={styles.warningTag}>
              <Icon
                size={IconSize.Sm}
                color={IconColor.Error}
                name={IconName.Danger}
              />
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Error}
                style={styles.warningText}
              >
                {warning}
              </Text>
            </View>
          )}
        </ListItemColumn>
        {renderArrowRight && (
          <ListItemColumn>
            <Icon
              style={styles.action}
              size={IconSize.Md}
              name={IconName.ArrowRight}
              color={IconColor.Default}
            />
          </ListItemColumn>
        )}
      </ListItem>
    </TouchableOpacity>
  );
};

export default SettingsDrawer;
