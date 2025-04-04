import { renderScreen } from '../../../../util/test/renderWithProvider';
import AppInformation from './';

describe('AppInformation', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      AppInformation,
      { name: 'AppInformation' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
