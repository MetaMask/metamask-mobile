import React from 'react';
import I18n, { I18nEvents } from '../../../../locales/i18n';
import MarketingMomentTitle from './MarketingMomentTitle';

const setLocale = (locale: string) => {
  I18n.locale = locale;
  I18nEvents.emit('localeChanged', locale);
};

const MarketingMomentTitleMeta = {
  title: 'Components / UI / MarketingMomentTitle',
  component: MarketingMomentTitle,
};

export default MarketingMomentTitleMeta;

export const Grotzec = {
  render: () => {
    setLocale('en');
    return <MarketingMomentTitle>Perps are here</MarketingMomentTitle>;
  },
};

export const SystemFont = {
  render: () => {
    setLocale('ja');
    return <MarketingMomentTitle>パープスが登場</MarketingMomentTitle>;
  },
};
