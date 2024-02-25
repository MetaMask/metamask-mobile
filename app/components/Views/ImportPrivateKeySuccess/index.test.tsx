import ImportPrivateKeySuccess from './';
import { renderScreen } from '../../../util/test/renderWithProvider';

describe('ImportPrivateKeySuccess', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(ImportPrivateKeySuccess, {
      name: 'ImportPrivateKeySuccess',
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
