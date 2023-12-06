import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import SettingsNotification from '../SettingsNotification';
import { strings } from '../../../../locales/i18n';
import { useTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import Icon, {
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
import HelpText, {
  HelpTextSeverity,
} from '../../../component-library/components/Form/HelpText';

const createStyles = (colors, titleColor) =>
  StyleSheet.create({
    root: {
      backgroundColor: colors.background.default,
      padding: 16,
    },
    action: {
      paddingLeft: 16,
    },
    warning: {
      alignSelf: 'flex-start',
      marginTop: 20,
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
   * Disable bottom border
   */
  noBorder: PropTypes.bool,
  /**
   * Handler called when this drawer is pressed
   */
  onPress: PropTypes.func,
  /**
   * Display SettingsNotification
   */
  warning: PropTypes.bool,
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

const defaultProps = {
  onPress: undefined,
};

const SettingsDrawer = ({
  title,
  description,
  noBorder,
  onPress,
  warning,
  renderArrowRight = true,
  testID,
  titleColor,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors, titleColor);

  return (
    <TouchableOpacity onPress={onPress} {...generateTestId(Platform, testID)}>
      <ListItem style={styles.root} gap={16}>
        <ListItemColumn widthType={WidthType.Fill}>
          <Text variant={TextVariant.BodyLGMedium}>{title}</Text>
          {description && (
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {description}
            </Text>
          )}
          <View>
            <SettingsNotification
              style={styles.warning}
              isWarning
              isNotification
            >
              <HelpText>{strings('drawer.settings_warning')}</HelpText>
            </SettingsNotification>
          </View>
        </ListItemColumn>
        {renderArrowRight && (
          <ListItemColumn>
            <Icon
              style={styles.action}
              size={IconSize.Md}
              name={IconName.ArrowRight}
            />
          </ListItemColumn>
        )}
      </ListItem>
    </TouchableOpacity>
  );
};

SettingsDrawer.propTypes = propTypes;
SettingsDrawer.defaultProps = defaultProps;

export default SettingsDrawer;
