import { backgroundState } from '../../../../util/test/initial-root-state';
import DeveloperOptions from './';
import { renderScreen } from '../../../../util/test/renderWithProvider';

const initialState = {
  DeveloperOptions: {},
  engine: {
    backgroundState,
  },
};

describe('DeveloperOptions', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      DeveloperOptions,
      { name: 'DeveloperOptions' },
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
