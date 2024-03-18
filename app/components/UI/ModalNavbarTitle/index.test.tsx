import React from 'react';
import { render } from '@testing-library/react-native';
import ModalNavbarTitle from './';

describe('ModalNavbarTitle', () => {
  it('should render correctly', () => {
    const title = 'Test';

    const { toJSON } = render(<ModalNavbarTitle title={title} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
