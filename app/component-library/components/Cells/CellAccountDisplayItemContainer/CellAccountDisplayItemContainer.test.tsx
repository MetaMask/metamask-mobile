// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellAccountDisplayItemContainer from './CellAccountDisplayItemContainer';

describe('CellAccountDisplayItemContainer - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <CellAccountDisplayItemContainer>
        <View />
      </CellAccountDisplayItemContainer>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
