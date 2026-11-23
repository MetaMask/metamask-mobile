import React, { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import {
  FontFamily,
  Text,
  TextVariant,
  type TextProps,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import I18n, { I18nEvents } from '../../../../locales/i18n';
import {
  getMarketingMomentTitlePresentation,
  supportsGrotzecLocale,
} from './MarketingMomentTitle.utils';

const subscribeToLocale = (onLocaleChanged: () => void) => {
  I18nEvents.addListener('localeChanged', onLocaleChanged);
  return () => I18nEvents.removeListener('localeChanged', onLocaleChanged);
};

const getLocaleSnapshot = () => I18n.locale || 'en';

/**
 * Display title for a marketing moment. Grotzec languages use the hero face
 * and the tight metrics for the requested Display or Heading size. Every other
 * language uses the system face, and Display sizes step down one level.
 */
const MarketingMomentTitle = ({
  accessibilityRole = 'header',
  variant = TextVariant.DisplayXl,
  style,
  twClassName,
  children,
  ...props
}: TextProps) => {
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    getLocaleSnapshot,
  );
  const tw = useTailwind();
  const presentation = getMarketingMomentTitlePresentation(
    supportsGrotzecLocale(locale),
    Platform.OS,
    variant,
  );
  // Text paints the variant first, then this list. Later entries win.
  const titleStyle = [
    // Hero metrics. A style so leading and tracking replace the variant.
    presentation.className ? tw.style(presentation.className) : undefined,
    // System face. Not a Tailwind class, so it cannot go through tw.style.
    presentation.style,
    // Caller style last, so a screen can still override both.
    style,
  ]
    .flat()
    .filter((entry) => entry != null);

  return (
    <Text
      accessibilityRole={accessibilityRole}
      {...props}
      variant={presentation.variant}
      fontFamily={presentation.fontFamily ?? FontFamily.Default}
      twClassName={twClassName}
      style={titleStyle.length > 0 ? titleStyle : undefined}
    >
      {children}
    </Text>
  );
};

export default MarketingMomentTitle;
