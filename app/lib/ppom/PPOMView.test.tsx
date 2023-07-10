import React from 'react';
import { render } from '@testing-library/react-native';
import { shallow } from 'enzyme';

import { PPOMView } from './PPOMView';

describe('PPOMView', () => {
  it('should render correctly shallow', () => {
    const wrapper = shallow(<PPOMView />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly deeply', () => {
    const wrapper = render(<PPOMView />);
    expect(wrapper).toMatchSnapshot();
  });
});
