import { renderScreen } from '../../../../util/test/renderWithProvider';
import AppInformation from './';

describe('AppInformation', () => {
  it('should render correctly', () => {
    const wrapper = renderScreen(
      AppInformation,
      { name: 'AppInformation' },
      { state: {} },
    );
    expect(wrapper).toMatchSnapshot();
  });
});
