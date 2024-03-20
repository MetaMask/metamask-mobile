import { renderScreen } from '../../..//util/test/renderWithProvider';
import { UpdateNeeded } from './';

describe('UpdateNeeded', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(
      UpdateNeeded,
      { name: 'UpdateNeeded' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
