import { renderScreen } from '../../../../util/test/renderWithProvider';
import NetworksSettings from './';
import { backgroundState } from '../../../../util/test/initial-root-state';
import mockedEngine from '../../../../core/__mocks__/MockedEngine';

const initialState = {
  engine: {
    backgroundState,
  },
};

jest.mock('../../../../core/Engine', () => ({
  init: () => mockedEngine.init(),
}));

describe('NetworksSettings', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      NetworksSettings,
      { name: 'Network Settings' },
      {
        state: initialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
