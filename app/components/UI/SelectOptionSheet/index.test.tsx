import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import SelectOptionSheet, { iSelectOption } from './';

jest.mock('../../../core/Engine', () => ({
  context: {
    colors: {},
  },
}));

describe('SelectOptionSheet', () => {
  it('should render correctly', () => {
    const options: iSelectOption[] = [
      { key: 'key 1', value: 'val 1', label: 'option 1' },
      { key: 'key 2', value: 'val 2', label: 'option 2' },
    ];

    const mockOnValueChange = jest.fn();

    const { toJSON } = renderWithProvider(
      <SelectOptionSheet
        options={options}
        selectedValue={'val 2'}
        label={'Choose an option'}
        defaultValue={options[0].value}
        onValueChange={mockOnValueChange}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
