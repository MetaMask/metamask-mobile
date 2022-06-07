const formatNumber = (value: number) =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // TODO: add I18n support
export default formatNumber;
