import { strings } from '../../../../../../../locales/i18n';

const AUTO_LOCK_OPTIONS = [
  {
    value: '0',
    label: strings('app_settings.autolock_immediately'),
    key: '0',
  },
  {
    value: '5000',
    label: strings('app_settings.autolock_after', { time: 5 }),
    key: '5000',
  },
  {
    value: '15000',
    label: strings('app_settings.autolock_after', { time: 15 }),
    key: '15000',
  },
  {
    value: '30000',
    label: strings('app_settings.autolock_after', { time: 30 }),
    key: '30000',
  },
  {
    value: '60000',
    label: strings('app_settings.autolock_after', { time: 60 }),
    key: '60000',
  },
  {
    value: '300000',
    label: strings('app_settings.autolock_after_minutes', { time: 5 }),
    key: '300000',
  },
  {
    value: '600000',
    label: strings('app_settings.autolock_after_minutes', { time: 10 }),
    key: '600000',
  },
  {
    value: '-1',
    label: strings('app_settings.autolock_never'),
    key: '-1',
  },
];

export default AUTO_LOCK_OPTIONS;
