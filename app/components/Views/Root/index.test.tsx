import { renderScreen } from '../../../util/test/renderWithProvider';
import Root from './';

jest.mock('redux-persist', () => {
  const real = jest.requireActual('redux-persist');
  const mockPersistReducer = jest
    .fn()
    .mockImplementation((_, reducers) => reducers);
  const mockCombineReducers = jest
    .fn()
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
import { render, waitFor } from '@testing-library/react-native';
import SecureKeychain from '../../../core/SecureKeychain';
import EntryScriptWeb3 from '../../../core/EntryScriptWeb3';

jest.mock('../../../core/SecureKeychain', () => ({
  init: jest.fn(),
}));

jest.mock('../../../core/EntryScriptWeb3', () => ({
  init: jest.fn(),
}));

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

  it('should initialize SecureKeychain', async () => {
    render(<Root foxCode="" />);
    await waitFor(() => {
      expect(SecureKeychain.init).toHaveBeenCalled();
    });
  });

  it('should initialize EntryScriptWeb3', async () => {
    render(<Root foxCode="" />);
    expect(EntryScriptWeb3.init).toHaveBeenCalled();
  });
});
