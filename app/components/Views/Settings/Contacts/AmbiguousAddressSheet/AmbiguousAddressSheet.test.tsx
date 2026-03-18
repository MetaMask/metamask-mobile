import AmbiguousAddressSheet from './AmbiguousAddressSheet';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';

describe('AmbiguousAddressSheet', () => {
  it('should render correctly', () => {
    const component = renderScreen(AmbiguousAddressSheet, {
      name: Routes.SHEET.AMBIGUOUS_ADDRESS,
    });
    expect(component).toMatchSnapshot();
  });
});
