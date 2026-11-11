import React from 'react';
import { Box, BoxJustifyContent } from '@metamask/design-system-react-native';
import { Theme } from '@metamask/design-system-twrnc-preset';
import I18n, { I18nEvents } from '../../../../locales/i18n';
import MarketingMomentTitle from '../MarketingMomentTitle';
import MarketingMoment from './MarketingMoment';

const setLocale = (locale: string) => {
  I18n.locale = locale;
  I18nEvents.emit('localeChanged', locale);
};

const MarketingMomentMeta = {
  title: 'Components / UI / MarketingMoment',
  component: MarketingMoment,
  decorators: [
    (Story: React.FC) => (
      <Box twClassName="h-full flex-1">
        <Story />
      </Box>
    ),
  ],
};

export default MarketingMomentMeta;

const actions = {
  primaryAction: { label: 'Get started' },
  secondaryAction: { label: 'Not now' },
};

export const Actions = {
  render: () => {
    setLocale('en');
    return (
      <MarketingMoment
        title="Perps are here"
        description="Trade with leverage. The title uses Grotzec in supported languages."
        {...actions}
      />
    );
  },
};

export const Artwork = {
  render: () => {
    setLocale('en');
    return (
      <MarketingMoment
        title="Perps are here"
        description="Artwork sits in the flexible area between the copy and the buttons."
        artworkWrapperProps={{
          justifyContent: BoxJustifyContent.End,
          className: 'overflow-visible',
        }}
        artwork={<Box twClassName="h-48 w-full bg-primary-default" />}
        {...actions}
      />
    );
  },
};

export const DarkBackground = {
  render: () => {
    setLocale('en');
    return (
      <MarketingMoment
        theme={Theme.Dark}
        background={<Box twClassName="flex-1 bg-accent02-dark" />}
        title="Spend and earn"
        description="A dark theme and a full-bleed background, as on Card and VIP."
        titleProps={{ twClassName: 'text-accent02-light text-center' }}
        descriptionProps={{ twClassName: 'text-accent02-light text-center' }}
        primaryAction={{ label: 'Get started' }}
        secondaryAction={{ label: 'Not now' }}
      />
    );
  },
};

export const UnsupportedLanguage = {
  render: () => {
    setLocale('zh');
    return (
      <MarketingMoment
        title={
          <Box twClassName="w-full" gap={6}>
            <MarketingMomentTitle twClassName="w-full text-center">
              永续合约来了
            </MarketingMomentTitle>
            <MarketingMomentTitle twClassName="w-full text-center">
              Перпы уже здесь
            </MarketingMomentTitle>
            <MarketingMomentTitle twClassName="w-full text-center">
              Τα perps είναι εδώ
            </MarketingMomentTitle>
          </Box>
        }
        description="Grotzec cannot draw Chinese, Russian, or Greek, so these titles use the system face at a smaller size."
        {...actions}
      />
    );
  },
};
