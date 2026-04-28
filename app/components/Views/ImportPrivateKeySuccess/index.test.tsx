import ImportPrivateKeySuccess from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { screen } from '@testing-library/react-native';

describe('ImportPrivateKeySuccess', () => {
  it('should render correctly', () => {
    renderScreen(ImportPrivateKeySuccess, {
      name: 'ImportPrivateKeySuccess',
    });
    screen.getByText('Account successfully imported!');
  });
});
