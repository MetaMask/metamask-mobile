// Third party dependencies.
import React from 'react';
import { View } from 'react-native';
import { shallow } from 'enzyme';

// Internal dependencies.
import CellDisplayContainer from './CellDisplayContainer';

describe('CellDisplayContainer - Snapshot', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <CellDisplayContainer>
        <View />
      </CellDisplayContainer>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
