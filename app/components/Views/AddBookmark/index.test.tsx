import React from 'react';
import { render } from '@testing-library/react-native';
import AddBookmark from './';

describe('AddBookmark', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <AddBookmark
        navigation={{ setOptions: () => null }}
        route={{ params: {} }}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
