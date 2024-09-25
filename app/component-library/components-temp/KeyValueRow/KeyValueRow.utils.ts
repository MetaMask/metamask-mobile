import { KeyValueRowProps } from './KeyValueRow.types';

export const areKeyValueRowPropsEqual = (
  prevProps: KeyValueRowProps,
  newProps: KeyValueRowProps,
) =>
  JSON.stringify(prevProps.field) === JSON.stringify(newProps.field) &&
  JSON.stringify(prevProps.value) === JSON.stringify(newProps.value);
