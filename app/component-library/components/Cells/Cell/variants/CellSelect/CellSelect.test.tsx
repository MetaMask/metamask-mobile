// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import CellSelect from './CellSelect';
import {
  CELLSELECT_TEST_ID,
  SAMPLE_CELLSELECT_PROPS,
} from './CellSelect.constants';

describe('CellSelect', () => {
  it('should render default settings correctly', () => {
    const wrapper = render(<CellSelect {...SAMPLE_CELLSELECT_PROPS} />);
    expect(wrapper).toMatchSnapshot();
  });
  it('should render CellSelect', () => {
    const { queryByTestId } = render(
      <CellSelect {...SAMPLE_CELLSELECT_PROPS} />,
    );
    expect(queryByTestId(CELLSELECT_TEST_ID)).not.toBe(null);
  });
});
