import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SelectComponent from './';

jest.mock('../../../core/Engine', () => ({
  context: {
    colors: {},
  },
}));

describe('SelectComponent', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <SelectComponent
        options={[
          { key: 'key 1', val: 'val 1', label: 'option 1' },
          { key: 'key 2', val: 'val 2', label: 'option 2' },
        ]}
        selectedValue={'val 2'}
        label={'Choose an option'}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
