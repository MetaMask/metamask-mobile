// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// Internal dependencies.
import Tag from './Tag';

describe('Tag', () => {
  it('should render correctly', () => {
    const wrapper = render(<Tag label={'Imported'} />);
    expect(wrapper).toMatchSnapshot();
  });
});
