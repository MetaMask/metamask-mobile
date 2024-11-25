import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../util/test/renderWithProvider';
import LoadingAnimation from './';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { RootState } from '../../../../../reducers';

/*
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      setOptions: jest.fn(),
      pop: jest.fn(),
      navigate: jest.fn(),
    }),
    useRoute: () => ({}),
    useLinking: jest.fn(),
  };
});
*/

const mockInitialState: DeepPartial<RootState> = {
  engine: {
    backgroundState: {
      ...backgroundState,
    },
  },
};

/*
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));
*/

describe('LoadingAnimation', () => {
  it('renders', () => {
    const wrapper = renderWithProvider(<LoadingAnimation />, {
      state: mockInitialState,
    });
    expect(wrapper).toMatchSnapshot();
  });
});
