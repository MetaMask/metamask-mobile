import AmbiguousAddressSheet from './AmbiguousAddressSheet';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';

describe('AmbiguousAddressSheet', () => {
  it('should render correctly', () => {
    const { toJSON } = renderScreen(AmbiguousAddressSheet, {
      name: Routes.SHEET.AMBIGUOUS_ADDRESS,
    });
    expect(toJSON()).toMatchSnapshot();
  });
});
