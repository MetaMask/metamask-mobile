import NavbarTitle from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

describe('NavbarTitle', () => {
  it('should render correctly', () => {
    const title = 'Test';
    const { toJSON } = renderScreen(
      NavbarTitle,
      {
        name: 'NavbarTitle',
        options: { title },
      },
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
