import { useMemo } from 'react';
import { createFormatters } from '@metamask/assets-controllers';
import I18n from '../../../locales/i18n';

export const getLocaleLanguageCode = () => I18n.locale.split('-')[0];

export function useFormatters() {
  const locale = getLocaleLanguageCode();
  return useMemo(() => createFormatters({ locale }), [locale]);
}
