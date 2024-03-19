import OptinMetrics from './';
import { renderScreen } from '../../../util/test/renderWithProvider';

describe('OptinMetrics', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      OptinMetrics,
      { name: 'OptinMetrics' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
