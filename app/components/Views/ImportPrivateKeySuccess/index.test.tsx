import ImportPrivateKeySuccess from './';
import { renderScreen } from '../../../util/test/renderWithProvider';

describe('ImportPrivateKeySuccess', () => {
  it('should render correctly', () => {
    const component = renderScreen(ImportPrivateKeySuccess, {
      name: 'ImportPrivateKeySuccess',
    });
    expect(component).toMatchSnapshot();
  });
});
