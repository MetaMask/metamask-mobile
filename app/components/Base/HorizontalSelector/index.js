import React, { Fragment, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Text from '../Text';
import { useTheme } from '../../../util/theme';

const INNER_CIRCLE_SCALE = 0.445;
const OPTION_WIDTH = 110;
const createStyles = (colors) =>
  StyleSheet.create({
    selector: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    labels: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'flex-start',
    },
    option: {
      width: OPTION_WIDTH,
      display: 'flex',
      alignItems: 'center',
      flex: 0,
      flexDirection: 'column',
    },
    circle: (size) => ({
      width: size,
      height: size,
      flexShrink: 0,
      flexGrow: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderRadius: 9999,
      borderColor: colors.border.muted,
    }),
    circleSelected: {
      borderColor: colors.primary.default,
    },
    circleError: {
      borderColor: colors.error.default,
    },
    circleDisabled: {
      opacity: 0.4,
    },
    innerCircle: (size) => ({
      width: size * INNER_CIRCLE_SCALE,
      height: size * INNER_CIRCLE_SCALE,
      flexShrink: 0,
      flexGrow: 0,
      backgroundColor: colors.primary.default,
      borderRadius: 999,
    }),
    innerCircleError: {
      backgroundColor: colors.error.default,
    },
    verticalLine: {
      marginTop: 2,
      marginBottom: -1,
      width: 0,
      height: 4,
      borderLeftWidth: 1,
      borderColor: colors.border.muted,
    },
    topVerticalLine: {
      marginTop: 0,
      marginBottom: 2,
      width: 0,
      height: 4,
      borderLeftWidth: 1,
      borderColor: colors.primary.default,
    },
    line: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
      marginBottom: 2,
    },
    lineHolder: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 0,
    },
    lineFill: {
      flex: 1,
    },
    lineVisible: {
      borderTopWidth: 1,
      borderColor: colors.border.muted,
    },
    circleHitSlop: {
      top: 0,
      bottom: 20,
      left: 0,
      right: 0,
    },
  });

function Circle({ size = 22, selected, disabled, error }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View
      style={[
        styles.circle(size),
        selected && styles.circleSelected,
        selected && error && styles.circleError,
        disabled && styles.circleDisabled,
      ]}
    >
      {selected && (
        <View
          style={[
            styles.innerCircle(size),
            selected && error && styles.innerCircleError,
            {
              width: size * INNER_CIRCLE_SCALE,
              height: size * INNER_CIRCLE_SCALE,
            },
          ]}
        />
      )}
    </View>
  );
}
Circle.propTypes = {
  size: PropTypes.number,
  selected: PropTypes.bool,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
};

function Option({ onPress, name, ...props }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const handlePress = useCallback(() => onPress(name), [name, onPress]);
  return (
    <TouchableOpacity onPress={handlePress} style={styles.option} {...props} />
  );
}

Option.propTypes = {
  onPress: PropTypes.func,
  name: PropTypes.string,
};

function HorizontalSelector({
  options = [],
  selected,
  circleSize,
  onPress,
  disabled,
  ...props
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const hasTopLabels = useMemo(
    () => options.some((option) => option.topLabel),
    [options],
  );

  return (
    <View {...props}>
      {hasTopLabels && (
        <View style={styles.selector}>
          {options.map((option) =>
            option.topLabel ? (
              <View key={option.name} style={styles.option}>
                {typeof option.topLabel === 'string' ? (
                  <Text noMargin bold link small centered>
                    {option.topLabel}
                  </Text>
                ) : typeof option.topLabel === 'function' ? (
                  option.topLabel(
                    option.name === selected,
                    option.disabled ?? disabled,
                  )
                ) : (
                  option.topLabel
                )}
                <View style={styles.topVerticalLine} />
              </View>
            ) : (
              <View key={option.name} style={styles.option} />
            ),
          )}
        </View>
      )}
      <View style={styles.selector}>
        {options.map((option) => (
          <Option
            key={option.name}
            onPress={onPress}
            selected={option.name === selected}
            hitSlop={styles.circleHitSlop}
            {...option}
            disabled={disabled ?? option.disabled}
          >
            <Circle
              selected={option.name === selected}
              size={circleSize}
              disabled={option.disabled || disabled}
              error={option.error}
            />
            <View style={styles.verticalLine} />
          </Option>
        ))}
      </View>
      <View style={styles.line}>
        {options.map((option, index, array) => (
          <Fragment key={option.name}>
            <View
              style={[styles.lineFill, index !== 0 && styles.lineVisible]}
            />
            <View style={[styles.lineHolder, styles.lineFill]}>
              <View
                style={[styles.lineFill, index !== 0 && styles.lineVisible]}
              />
              <View
                style={[
                  styles.lineFill,
                  index !== array.length - 1 && styles.lineVisible,
                ]}
              />
            </View>
            <View
              style={[
                styles.lineFill,
                index !== array.length - 1 && styles.lineVisible,
              ]}
            />
          </Fragment>
        ))}
      </View>
      <View style={styles.labels}>
        {options.map((option) => (
          <Option
            key={option.name}
            onPress={onPress}
            selected={option.name === selected}
            {...option}
            disabled={disabled ?? option.disabled}
          >
            {typeof option.label === 'string' ? (
              <Text centered>{option.label}</Text>
            ) : typeof option.label === 'function' ? (
              option.label(
                option.name === selected,
                option.disabled ?? disabled,
              )
            ) : (
              option.label
            )}
          </Option>
        ))}
      </View>
    </View>
  );
}

HorizontalSelector.propTypes = {
  /**
   * Array of options
   */
  options: PropTypes.arrayOf(
    PropTypes.shape({
      /**
       * Label of the option. It can be a string, component or a render
       * function, which will be called with arguments (selected, disabled).
       */
      label: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
      /**
       * Top label of the option. It can be a string, component or a render function.
       */
      topLabel: PropTypes.oneOfType([PropTypes.func, PropTypes.node]),
      /**
       * Option name string, this is used as argument when calling the onPress function.
       */
      name: PropTypes.string,
      /**
       * Boolean value to determine whether if option is disabled or not.
       */
      disabled: PropTypes.bool,
      /**
       * Boolean value to determine if the option should represent an error
       */
      error: PropTypes.bool,
    }),
  ),
  /**
   * Boolean value to determine whether the options are disabked or not.
   */
  disabled: PropTypes.bool,
  /**
   * Function that is called when pressing an option. The function is called with option.name argument.
   */
  onPress: PropTypes.func,
  /**
   * Size of the option circle
   */
  circleSize: PropTypes.number,
  /**
   * Current option name selected
   */
  selected: PropTypes.string,
};

export default HorizontalSelector;
