import I18n from '../../locales/i18n';

export const formatNumber = (value: number) => {
    return new Intl.NumberFormat(I18n.locale).format(value);
}
