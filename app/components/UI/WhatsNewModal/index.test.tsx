import { renderScreen } from '../../../util/test/renderWithProvider';
import WhatsNewModal from './';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockInitialState = {
  settings: {},
  engine: {
    backgroundState,
  },
};

describe('WhatsNewModal', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderScreen(
      WhatsNewModal,
      {
        name: 'WhatsNewModal',
      },
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
