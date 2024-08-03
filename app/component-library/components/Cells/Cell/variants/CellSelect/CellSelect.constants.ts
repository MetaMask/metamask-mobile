// External dependencies.
import { SAMPLE_CELLBASE_PROPS } from '../../foundation/CellBase/CellBase.constants';

// Internal dependencies.
import { CellSelectProps } from './CellSelect.types';

// eslint-disable-next-line import/prefer-default-export
export const SAMPLE_CELLSELECT_PROPS: CellSelectProps = {
  ...SAMPLE_CELLBASE_PROPS,
  isSelected: false,
  isDisabled: false,
};
