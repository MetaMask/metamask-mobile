// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import CellSelect from './CellSelect';
import { SAMPLE_CELLSELECT_PROPS } from './CellSelect.constants';
import { CellComponentSelectorsIDs } from '../../CellComponent.testIds';

describe('CellSelect', () => {
  it('should render default settings correctly', () => {
    const wrapper = render(<CellSelect {...SAMPLE_CELLSELECT_PROPS} />);
    expect(wrapper.toJSON()).toBeDefined();
  });
  it('should render CellSelect', () => {
    const { queryByTestId } = render(
      <CellSelect {...SAMPLE_CELLSELECT_PROPS} />,
    );
    expect(queryByTestId(CellComponentSelectorsIDs.SELECT)).not.toBe(null);
  });
});
