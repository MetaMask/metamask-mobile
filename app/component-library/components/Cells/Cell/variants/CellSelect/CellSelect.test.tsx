// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import CellSelect from './CellSelect';
import { SAMPLE_CELLSELECT_PROPS } from './CellSelect.constants';
import { CellModalSelectorsIDs } from '../../../../../../../e2e/selectors/Modals/CellModal.selectors';

describe('CellSelect', () => {
  it('should render default settings correctly', () => {
    const wrapper = render(<CellSelect {...SAMPLE_CELLSELECT_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellSelect', () => {
    const { queryByTestId } = render(
      <CellSelect {...SAMPLE_CELLSELECT_PROPS} />,
    );
    expect(queryByTestId(CellModalSelectorsIDs.SELECT)).not.toBe(null);
  });
});
