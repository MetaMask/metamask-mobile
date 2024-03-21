import { renderScreen } from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';
import App from './';

const initialState = {
  user: {
    loggedIn: true,
  },
  engine: {
    ...initialBackgroundState,
  },
};

describe('App', () => {
  it('should render correctly when logged in', () => {
    const { toJSON } = renderScreen(
      App,
      { name: 'App' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
