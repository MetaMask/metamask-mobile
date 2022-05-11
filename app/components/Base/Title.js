import React from 'react';
import PropTypes from 'prop-types';
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../styles/common';
import Text from './Text.js';
import { useAppThemeFromContext, mockTheme } from '../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    text: {
      fontSize: 18,
      marginVertical: 3,
      color: colors.text.default,
      ...fontStyles.bold,
    },
    hero: {
      fontSize: 22,
    },
    centered: {
      textAlign: 'center',
    },
  });

const Title = ({ centered, hero, style: externalStyle, ...props }) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const style = createStyles(colors);

  return (
    <Text
      style={[
        style.text,
        centered && style.centered,
        hero && style.hero,
        externalStyle,
      ]}
      {...props}
    />
  );
};

Title.defaultProps = {
  centered: false,
  hero: false,
  style: undefined,
};

Title.propTypes = {
  /**
   * Aligns title to center
   */
  centered: PropTypes.bool,
  /**
   * Makes title bigger
   */
  hero: PropTypes.bool,
  /**
   * Any other external style defined in props will be applied
   */
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};

export default Title;
