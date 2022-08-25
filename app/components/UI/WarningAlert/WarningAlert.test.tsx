// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import WarningAlert from './WarningAlert';

describe('ButtonBase', () => {
  it('should render correctly', () => {
    const mockDismissFunction = jest.fn();
    const wrapper = shallow(
      <WarningAlert text={'test'} dismissAlert={mockDismissFunction} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
