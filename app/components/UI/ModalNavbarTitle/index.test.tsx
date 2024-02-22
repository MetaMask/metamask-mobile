import React from 'react';
import { render } from '@testing-library/react-native';
import ModalNavbarTitle from './';

describe('ModalNavbarTitle', () => {
  it('should render correctly', () => {
    const title = 'Test';

    const wrapper = render(<ModalNavbarTitle title={title} />);
    expect(wrapper).toMatchSnapshot();
  });
});
