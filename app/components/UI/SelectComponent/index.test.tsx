import React from 'react';
import { render } from '@testing-library/react-native';
import SelectComponent from './';

describe('SelectComponent', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <SelectComponent
        options={[
          { key: 'key 1', val: 'val 1', label: 'option 1' },
          { key: 'key 2', val: 'val 2', label: 'option 2' },
        ]}
        selectedValue={'val 2'}
        label={'Choose an option'}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
