import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../reducers';
import PermissionItem from './PermissionItem';
import mockPermissionItems from './PermissionItem.constants';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
    }),
  };
});

const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

describe('PermissionItem', () => {
  it('renders correctly', () => {
    const { getByText } = renderWithProvider(
      <PermissionItem item={mockPermissionItems[0]} />,
      { state: mockInitialState },
    );

    expect(getByText(mockPermissionItems[0].dappHostName)).toBeOnTheScreen();
  });
});
