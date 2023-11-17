// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import CellMultiSelect from './CellMultiSelect';
import { SAMPLE_CELLMULTISELECT_PROPS } from './CellMultiSelect.constants';
import { CellModalSelectorsIDs } from '../../../../../../../e2e/selectors/Modals/CellModal.selectors';

describe('CellMultiSelect', () => {
  it('should render default settings correctly', () => {
    const wrapper = render(
      <CellMultiSelect {...SAMPLE_CELLMULTISELECT_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellMultiSelect', () => {
    const { queryByTestId } = render(
      <CellMultiSelect {...SAMPLE_CELLMULTISELECT_PROPS} />,
    );
    expect(queryByTestId(CellModalSelectorsIDs.MULTISELECT)).not.toBe(null);
  });
});
