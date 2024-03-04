import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import AppInformation from './';

describe('AppInformation', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(
      <AppInformation
        navigation={{ setOptions: () => null }}
        route={{ params: {} }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
