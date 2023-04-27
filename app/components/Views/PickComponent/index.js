import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { baseStyles, fontStyles } from '../../../styles/common';
import { ThemeContext, mockTheme } from '../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      ...baseStyles.flexGrow,
      flexDirection: 'row',
    },
    circle: {
      width: 12,
      height: 12,
      borderRadius: 12 / 2,
      backgroundColor: colors.background.default,
      opacity: 1,
      margin: 2,
      borderWidth: 2,
      borderColor: colors.border.default,
      marginRight: 6,
    },
    option: {
      flex: 1,
    },
    touchableOption: {
      flex: 1,
      flexDirection: 'row',
    },
    optionText: {
      ...fontStyles.normal,
      color: colors.text.default,
    },
    selectedCircle: {
      width: 12,
      height: 12,
      borderRadius: 12 / 2,
      backgroundColor: colors.primary.default,
      opacity: 1,
      margin: 2,
      marginRight: 6,
    },
  });

/**
 * Componets that allows to select clicking two options
 */
export default class PickComponent extends PureComponent {
  static propTypes = {
    /**
     * Callback to pick an option
     */
    pick: PropTypes.func,
    /**
     * Text to first option
     */
    textFirst: PropTypes.string,
    /**
     * Value of first option
     */
    valueFirst: PropTypes.string,
    /**
     * Text to second option
     */
    textSecond: PropTypes.string,
    /**
     * Value of second option
     */
    valueSecond: PropTypes.string,
    /**
     * Current selected value
     */
    selectedValue: PropTypes.string,
  };

  pickFirst = () => {
    const { pick, valueFirst } = this.props;
    pick && pick(valueFirst);
  };

  pickSecond = () => {
    const { pick, valueSecond } = this.props;
    pick && pick(valueSecond);
  };

  render = () => {
    const { selectedValue, valueFirst, valueSecond, textFirst, textSecond } =
      this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);

    return (
      <View style={styles.root}>
        <View style={styles.option}>
          <TouchableOpacity
            onPress={this.pickFirst}
            style={styles.touchableOption}
          >
            <View
              style={
                selectedValue === valueFirst
                  ? styles.selectedCircle
                  : styles.circle
              }
            />
            <Text style={styles.optionText}>{textFirst}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.option}>
          <TouchableOpacity
            onPress={this.pickSecond}
            style={styles.touchableOption}
          >
            <View
              style={
                selectedValue === valueSecond
                  ? styles.selectedCircle
                  : styles.circle
              }
            />
            <Text style={styles.optionText}>{textSecond}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
}

PickComponent.contextType = ThemeContext;
