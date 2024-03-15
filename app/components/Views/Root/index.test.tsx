import { renderScreen } from '../../../util/test/renderWithProvider';
import Root from './';

jest.mock('redux-persist', () => {
  const real = jest.requireActual('redux-persist');
  const mockPersistReducer = jest
    .fn()
    .mockImplementation((_, reducers) => reducers);
  const mockCombineReducers = jest
    .fn()
    .mockReturnValue((reducers: any) => reducers);

  return {
    ...real,
    persistReducer: mockPersistReducer,
    combineReducers: mockCombineReducers,
  };
});

jest.mock('../../../util/test/configureStore', () => {
  const configureMockStore = jest.requireActual('redux-mock-store').default;
  return () => configureMockStore([])();
});

describe('Root', () => {
  it('should render correctly', () => {
    const initialState = {};

    const { toJSON } = renderScreen(
      Root,
      { name: 'Root' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
