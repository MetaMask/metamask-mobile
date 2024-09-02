import { renderScreen } from '../../../util/test/renderWithProvider';
import React from 'react';
import OptionsSheet from './OptionsSheet';
import Routes from '../../../constants/navigation/Routes';

function render(Component: React.ComponentType) {
  return renderScreen(Component, {
    name: Routes.OPTIONS_SHEET,
  });
}

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn().mockReturnValue({
    options: [
      { key: 'key 1', value: 'val 1', label: 'option 1' },
      { key: 'key 2', value: 'val 2', label: 'option 2' },
    ],
    label: 'Select a Account',
    onValueChange: jest.fn(),
  }),
}));

describe('OptionSheet', () => {
  it('renders correctly', () => {
    const { toJSON } = render(OptionsSheet);
    expect(toJSON()).toMatchSnapshot();
  });
});
