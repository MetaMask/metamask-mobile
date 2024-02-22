import React from 'react';
import { render } from '@testing-library/react-native';
import AddBookmark from './';

describe('AddBookmark', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <AddBookmark
        navigation={{ setOptions: () => null }}
        route={{ params: {} }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
