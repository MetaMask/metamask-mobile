import React, { Fragment, ReactNode, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import TouchableOpacity from '../TouchableOpacity';
import Text from '../Text';
import { useTheme } from '../../../util/theme';
import { Theme } from '@metamask/design-tokens';

const INNER_CIRCLE_SCALE = 0.445;
const OPTION_WIDTH = 110;

const createCircleStyle = (size: number, colors: Theme['colors']) => ({
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
});

const createInnerCircleStyle = (size: number, colors: Theme['colors']) => ({
  width: size * INNER_CIRCLE_SCALE,
  height: size * INNER_CIRCLE_SCALE,
  flexShrink: 0,
  flexGrow: 0,
  backgroundColor: colors.primary.default,
  borderRadius: 999,
});
const createStyles = (colors: Theme['colors']) =>
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
    circleSelected: {
      borderColor: colors.primary.default,
    },
    circleError: {
      borderColor: colors.error.default,
    },
    circleDisabled: {
      opacity: 0.4,
    },
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

function Circle({ size = 22, selected, disabled, error }: CircleProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View
      style={[
        createCircleStyle(size, colors),
        selected && styles.circleSelected,
        selected && error && styles.circleError,
        disabled && styles.circleDisabled,
      ]}
    >
      {selected && (
        <View
          style={[
            createInnerCircleStyle(size, colors),
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

function Option({ onPress, name, ...props }: OptionProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const handlePress = useCallback(() => onPress(name), [name, onPress]);
  return (
    <TouchableOpacity onPress={handlePress} style={styles.option} {...props} />
  );
}

function HorizontalSelector({
  options = [],
  selected,
  circleSize,
  onPress,
  disabled,
  ...props
}: HorizontalSelectorProps) {
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

interface CircleProps {
  /**
   * Size of the option circle
   */
  size?: number;
  /**
   * Current option name selected
   */
  selected?: boolean;
  disabled?: boolean;
  error?: boolean;
}

interface OptionProps {
  onPress: (name: string) => void;
  name: string;
  [key: string]: unknown;
}

interface OptionType {
  /**
   * Label of the option. It can be a string, component or a render
   * function, which will be called with arguments (selected, disabled).
   */
  label:
    | string
    | ReactNode
    | ((selected: boolean, disabled: boolean) => ReactNode);
  /**
   * Top label of the option. It can be a string, component or a render function.
   */
  topLabel?:
    | string
    | ReactNode
    | ((selected: boolean, disabled: boolean) => ReactNode);
  /**
   * Option name string, this is used as argument when calling the onPress function.
   */
  name: string;
  /**
   * Boolean value to determine whether if option is disabled or not.
   */
  disabled?: boolean;
  /**
   * Boolean value to determine if the option should represent an error
   */
  error?: boolean;
}

interface HorizontalSelectorProps {
  /**
   * Array of options
   */
  options: OptionType[];
  selected?: string;
  circleSize?: number;
  /**
   * Function that is called when pressing an option. The function is called with option.name argument.
   */
  onPress: (name: string) => void;
  /**
   * Boolean value to determine whether the options are disabled or not.
   */
  disabled: boolean;
}

export default HorizontalSelector;
