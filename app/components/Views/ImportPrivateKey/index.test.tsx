import { renderScreen } from '../../../util/test/renderWithProvider';
import ImportPrivateKey from './';

describe('ImportPrivateKey', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      ImportPrivateKey,
      { name: 'ImportPrivateKey' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
