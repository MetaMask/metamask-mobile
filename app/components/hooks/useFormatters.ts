import { useMemo } from 'react';
import { createFormatters } from '@metamask/assets-controllers';
import I18n from '../../../locales/i18n';

export function useFormatters() {
  const locale = I18n.locale.split('-')[0];
  return useMemo(() => createFormatters({ locale }), [locale]);
}
