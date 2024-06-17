import React from 'react';
import { render } from '@testing-library/react-native';

import CellSelectWithMenu from './CellSelectWithMenu';
import { CellModalSelectorsIDs } from '../../../../e2e/selectors/Modals/CellModal.selectors';

import { SAMPLE_CELLSELECT_WITH_BUTTON_PROPS } from './CellSelectWithMenu.constants';

describe('CellSelectWithMenu', () => {
  it('should render with default settings correctly', () => {
    const wrapper = render(
      <CellSelectWithMenu {...SAMPLE_CELLSELECT_WITH_BUTTON_PROPS} />,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should render CellSelectWithMenu', () => {
    const { queryByTestId } = render(
      <CellSelectWithMenu {...SAMPLE_CELLSELECT_WITH_BUTTON_PROPS} />,
    );
    // Adjust the testID to match the one used in CellSelectWithMenu, if different
    expect(queryByTestId(CellModalSelectorsIDs.MULTISELECT)).not.toBe(null);
  });
});
