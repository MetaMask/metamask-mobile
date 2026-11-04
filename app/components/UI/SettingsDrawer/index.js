import React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  ListItemVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

const createStyles = (colors) =>
  StyleSheet.create({
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
  });

const propTypes = {
  title: PropTypes.string,
  /**
   * Additional descriptive text about this option
   */
  description: PropTypes.string,
  /**
   * Handler called when this drawer is pressed
   */
  onPress: PropTypes.func,
  /**
   * Display SettingsNotification
   */
  warning: PropTypes.string,
  /**
   * Display arrow right
   */
  renderArrowRight: PropTypes.bool,
  /**
   * Test id for testing purposes
   */
  testID: PropTypes.string,
  /**
   * Title color
   */
  titleColor: PropTypes.string,
};

/**
 * @param {object} props
 * @param {any} props.title
 * @param {any} [props.description]
 * @param {() => void} props.onPress
 * @param {string} [props.warning]
 * @param {boolean} [props.renderArrowRight]
 * @param {string} [props.testID]
 * @param {any} [props.titleColor]
 */
const SettingsDrawer = ({
  title,
  description,
  onPress,
  warning,
  renderArrowRight = true,
  testID,
  titleColor = TextColor.TextDefault,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const hasSecondary = Boolean(description) || Boolean(warning);
  // Warning stays in the description slot so the chevron stays centered on the
  // whole block. OneLine keeps rows without a description at the 48dp minimum.
  const descriptionContent = warning ? (
    <>
      {description ? (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
        >
          {description}
        </Text>
      ) : null}
      <View style={styles.warningTag}>
        <Icon
          size={IconSize.Sm}
          color={IconColor.ErrorDefault}
          name={IconName.Danger}
        />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.ErrorDefault}
          style={styles.warningText}
        >
          {warning}
        </Text>
      </View>
    </>
  ) : (
    description
  );

  return (
    <ListItem
      isInteractive
      onPress={onPress}
      testID={testID}
      variant={
        hasSecondary ? ListItemVariant.TwoLines : ListItemVariant.OneLine
      }
      title={title}
      titleProps={{ color: titleColor }}
      description={descriptionContent}
      endAccessory={
        renderArrowRight ? (
          <Icon size={IconSize.Md} name={IconName.ArrowRight} />
        ) : undefined
      }
      accessoryGap={4}
    />
  );
};

SettingsDrawer.propTypes = propTypes;

export default SettingsDrawer;
