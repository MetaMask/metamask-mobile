import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View, Text, Image } from 'react-native';
import FadeIn from 'react-native-fade-in-image';
import { fontStyles } from '../../../styles/common';
import { getHost } from '../../../util/browser';
import { ThemeContext, mockTheme } from '../../../util/theme';
import withFaviconAwareness from '../../hooks/useFavicon/withFaviconAwareness';
import { isNumber } from 'lodash';
import { isFaviconSVG } from '../../../util/favicon';
import { SvgUri } from 'react-native-svg';

const createStyles = (colors) =>
  StyleSheet.create({
    fallback: {
      alignContent: 'center',
      backgroundColor: colors.background.default,
      borderRadius: 27,
      height: 54,
      justifyContent: 'center',
      width: 54,
    },
    fallbackText: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 24,
      textAlign: 'center',
      textTransform: 'uppercase',
    },
  });

/**
 * View that renders a website logo depending of the context
 */
/**
 * @deprecated The `<WebsiteIcon>` component has been deprecated in favor of the `<AvatarFavicon>` component from `@metamask/design-system-react-native`.
 * Please update your code to use the new `<AvatarFavicon>` component from `@metamask/design-system-react-native`.
 */
class WebsiteIcon extends PureComponent {
  static propTypes = {
    /**
     * Style object for image
     */
    style: PropTypes.object,
    /**
     * Style object for main view
     */
    viewStyle: PropTypes.object,
    /**
     * Style object for text in case url not found
     */
    textStyle: PropTypes.object,
    /**
     * String corresponding to website title
     */
    title: PropTypes.string,
    /**
     * String corresponding to website url
     */
    url: PropTypes.string,
    /**
     * Flag that determines if the background
     * should be transaparent or not
     */
    transparent: PropTypes.bool,
    /**
     * Icon image to use, this substitutes getting the icon from the url
     */
    icon: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),

    /**
     * Favicon source to use, this substitutes getting the icon from the url
     * This is populated by the withFaviconAwareness HOC
     */
    faviconSource: PropTypes.string,
  };

  state = {
    renderIconUrlError: false,
  };

  /**
   * Sets component state to renderIconUrlError to render placeholder image
   */
  onRenderIconUrlError = async () => {
    await this.setState({ renderIconUrlError: true });
  };

  render = () => {
    const { renderIconUrlError } = this.state;
    const {
      viewStyle,
      style,
      textStyle,
      transparent,
      url,
      icon,
      faviconSource,
    } = this.props;
    const colors = this.context.colors || mockTheme.colors;
    const styles = createStyles(colors);
    // apiLogoUrl is the url of the icon to be rendered, but it's populated
    // from the icon prop, if it exists, or from the faviconSource prop
    // that is provided by the withFaviconAwareness HOC for useFavicon hook.

    const apiLogoUrl = {
      uri: (typeof icon === 'string' ? icon : icon?.uri) || faviconSource,
    };

    let title = this.props.title;

    if (title !== undefined) {
      if (typeof this.props.title === 'string') {
        title = this.props.title.substring(0, 1);
      } else {
        const host = url && getHost(url);
        title = host ? host.substring(0, 1) : '';
      }
    }

    if (title && (!apiLogoUrl?.uri || renderIconUrlError)) {
      return (
        <View style={viewStyle}>
          <View style={[styles.fallback, style]}>
            <Text style={[styles.fallbackText, textStyle]}>{title}</Text>
          </View>
        </View>
      );
    }

    let imageSVG;

    if (apiLogoUrl && !isNumber(apiLogoUrl) && 'uri' in apiLogoUrl) {
      imageSVG = isFaviconSVG(apiLogoUrl);
    }

    return (
      <View style={viewStyle}>
        {imageSVG ? (
          <SvgUri
            uri={imageSVG}
            width={style.width}
            height={style.height}
            style={style}
            onError={this.onRenderIconUrlError}
          />
        ) : (
          <FadeIn
            placeholderStyle={{
              backgroundColor: transparent
                ? colors.transparent
                : colors.background.alternative,
            }}
          >
            <Image
              source={apiLogoUrl}
              style={style}
              onError={this.onRenderIconUrlError}
            />
          </FadeIn>
        )}
      </View>
    );
  };
}

WebsiteIcon.contextType = ThemeContext;

export default withFaviconAwareness(WebsiteIcon);
