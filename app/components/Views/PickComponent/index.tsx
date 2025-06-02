import React, { PureComponent } from 'react';
import { StyleSheet, View } from 'react-native';
import { baseStyles } from '../../../styles/common';
import { ThemeContext, mockTheme } from '../../../util/theme';
import RadioButton from '../../../component-library/components/RadioButton/RadioButton';
import { Theme } from '@metamask/design-tokens';

const createStyles = (_colors: Theme['colors']) =>
  StyleSheet.create({
    root: {
      ...baseStyles.flexGrow,
      flexDirection: 'row',
    },
    option: {
      flex: 1,
    },
  });

interface PickComponentProps {
  /**
   * Callback to pick an option
   */
  pick?: (value: string) => void;
  /**
   * Text to first option
   */
  textFirst: string;
  /**
   * Value of first option
   */
  valueFirst: string;
  /**
   * Text to second option
   */
  textSecond: string;
  /**
   * Value of second option
   */
  valueSecond: string;
  /**
   * Current selected value
   */
  selectedValue: string;
}

/**
 * Component that allows to select clicking two options
 */
export default class PickComponent extends PureComponent<PickComponentProps> {
  static contextType = ThemeContext;

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
    const colors =
      (this.context as unknown as Theme).colors || mockTheme.colors;
    const styles = createStyles(colors);

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
  };
}
