import React, { PureComponent } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../../styles/common';
import { connect } from 'react-redux';
import { ThemeContext, mockTheme } from '../../../../util/theme';
import generateTestId from '../../../../../wdio/utils/generateTestId';
import { TABS_NUMBER } from '../../../../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';

const createStyles = (colors) =>
  StyleSheet.create({
    tabIcon: {
      borderWidth: 2,
      borderColor: colors.text.alternative,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabCount: {
      color: colors.text.alternative,
      flex: 0,
      fontSize: 15,
      textAlign: 'center',
      alignSelf: 'center',
      ...fontStyles.normal,
    },
  });

/**
 * PureComponent that renders an icon showing
 * the current number of open tabs
 */
class TabCountIcon extends PureComponent {
  static propTypes = {
    /**
     * Switches to a specific tab
     */
    tabCount: PropTypes.number,
    /**
     * PureComponent styles
     */
    style: PropTypes.any,
  };

  render() {
    const { tabCount, style } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={[styles.tabIcon, style]}>
        <Text
          style={styles.tabCount}
          {...generateTestId(Platform, TABS_NUMBER)}
        >
          {tabCount}
        </Text>
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  tabCount: state.browser.tabs.length,
});

TabCountIcon.contextType = ThemeContext;

export default connect(mapStateToProps)(TabCountIcon);
