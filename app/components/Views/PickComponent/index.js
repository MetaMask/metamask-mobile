import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';
import { baseStyles } from '../../../styles/common';
import { ThemeContext, mockTheme } from '../../../util/theme';
import RadioButton from '../../../component-library/components/RadioButton/RadioButton';

const createStyles = (colors) =>
  StyleSheet.create({
    root: {
      ...baseStyles.flexGrow,
      flexDirection: 'row',
    },
    option: {
      flex: 1,
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

    return (
      <ThemeContext.Consumer>
        {({ colors }) => {
          const themeColors = colors || mockTheme.colors;
          const styles = createStyles(themeColors);

          return (
            <View style={styles.root}>
              <View style={styles.option}>
                <RadioButton
                  onPress={this.pickFirst}
                  isChecked={selectedValue === valueFirst}
                  label={textFirst}
                />
              </View>
              <View style={styles.option}>
                <RadioButton
                  onPress={this.pickSecond}
                  isChecked={selectedValue === valueSecond}
                  label={textSecond}
                />
              </View>
            </View>
          );
        }}
      </ThemeContext.Consumer>
    );
  };
}
