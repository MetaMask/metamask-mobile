import { renderScreen } from '../../../util/test/renderWithProvider';
import React from 'react';
import OptionsSheet from './OptionsSheet';
import Routes from '../../../constants/navigation/Routes';
import { SELECT_OPTION_PREFIX } from './constants';
import { fireEvent } from '@testing-library/react-native';
import { ISelectOptionSheet } from './types';

function render(Component: React.ComponentType) {
  return renderScreen(Component, {
    name: Routes.OPTIONS_SHEET,
  });
}

const mockUseParamsValues: ISelectOptionSheet = {
  options: [
    { key: 'key1', value: 'val 1', label: 'option 1' },
    { key: 'key2', value: 'val 2', label: 'option 2' },
  ],
  label: 'Select a Account',
  selectedValue: 'val 2',
  onValueChange: jest.fn(),
};

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

describe('OptionSheet', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('render matches snapshot', () => {
    const { toJSON } = render(OptionsSheet);
    expect(toJSON()).toMatchSnapshot();
  });

  it('shows all available options', () => {
    const { getByText } = render(OptionsSheet);
    expect(getByText('option 2')).toBeDefined();
    expect(getByText('option 1')).toBeDefined();
  });

  it('calls onValueChange when an option is selected', () => {
    const { getByTestId } = render(OptionsSheet);
    const option1 = getByTestId(SELECT_OPTION_PREFIX + 'key1');
    fireEvent.press(option1);
    expect(mockUseParamsValues.onValueChange).toHaveBeenCalledWith('val 1');
  });
});
