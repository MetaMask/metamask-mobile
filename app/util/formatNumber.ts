import I18n from '../../locales/i18n';

const formatNumber = (value: number) =>
  new Intl.NumberFormat(I18n.locale).format(value);

export default formatNumber;
