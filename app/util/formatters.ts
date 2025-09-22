import { useMemo } from 'react';
import { createFormatters } from '@metamask/assets-controllers';
import I18n from '../../locales/i18n';

export function useFormatters() {
  return useMemo(() => createFormatters({ locale: I18n.locale }), []);
}
