import React from 'react';
import { shallow } from 'enzyme';
import AccountBackupStep1B from './';

describe('AccountBackupStep1B', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<AccountBackupStep1B />);
    expect(wrapper).toMatchSnapshot();
  });
});
