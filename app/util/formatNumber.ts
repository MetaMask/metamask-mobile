export const formatNumber = (value: number | string) =>
  Number(value).toLocaleString('en-US');

export const formatLongValue = (value: number | string) =>
  value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
