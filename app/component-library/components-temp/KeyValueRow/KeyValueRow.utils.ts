import {
  KeyValueRowLabelProps,
  PreDefinedKeyValueRowLabel,
} from './KeyValueRow.types';

export const isPreDefinedKeyValueRowLabel = (
  label: KeyValueRowLabelProps['label'],
): label is PreDefinedKeyValueRowLabel =>
  !!label && typeof label === 'object' && 'text' in label;
