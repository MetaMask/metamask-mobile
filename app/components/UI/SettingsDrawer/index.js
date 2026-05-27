import React from 'react';
import { View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
import Pressable from '../../../component-library/components-temp/Pressable';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  ListItem,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      paddingTop: 12,
      paddingBottom: 12,
      paddingLeft: 16,
      paddingRight: 16,
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
  return (
    <Pressable onPress={onPress} testID={testID}>
      <ListItem style={styles.root} gap={16}>
        <Box flexDirection={BoxFlexDirection.Column} twClassName="flex-1">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={titleColor}
          >
            {title}
          </Text>
          {description && (
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
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
                variant={TextVariant.BodyMd}
                color={TextColor.ErrorDefault}
                style={styles.warningText}
              >
                {warning}
              </Text>
            </View>
          )}
        </Box>
        {renderArrowRight && (
          <Box>
            <Icon
              style={styles.action}
              size={IconSize.Md}
              name={IconName.ArrowRight}
            />
          </Box>
        )}
      </ListItem>
    </Pressable>
  );
};

SettingsDrawer.propTypes = propTypes;

export default SettingsDrawer;
