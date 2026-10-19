import React, { useSyncExternalStore } from 'react';
import {
  FontFamily,
  Text,
  type TextProps,
} from '@metamask/design-system-react-native';
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
 * and the tight marketing metrics. Every other language uses the system face
 * at DisplayLg.
 */
const MarketingMomentTitle = ({
  accessibilityRole = 'header',
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
  const presentation = getMarketingMomentTitlePresentation(
    supportsGrotzecLocale(locale),
  );

  return (
    <Text
      accessibilityRole={accessibilityRole}
      {...props}
      variant={presentation.variant}
      fontFamily={presentation.fontFamily ?? FontFamily.Default}
      twClassName={`w-full text-center${
        presentation.className ? ` ${presentation.className}` : ''
      }${twClassName ? ` ${twClassName}` : ''}`}
      style={[presentation.style, style]}
    >
      {children}
    </Text>
  );
};

export default MarketingMomentTitle;
