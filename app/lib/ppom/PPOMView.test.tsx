import React from 'react';
import { render } from '@testing-library/react-native';

import { PPOMView } from './PPOMView';

describe('PPOMView', () => {
  it('should render correctly deeply', () => {
    const wrapper = render(<PPOMView />);
    expect(wrapper).toMatchSnapshot();
  });
});
