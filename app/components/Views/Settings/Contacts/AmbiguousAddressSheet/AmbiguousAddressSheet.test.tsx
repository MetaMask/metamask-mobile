import AmbiguousAddressSheet from './AmbiguousAddressSheet';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { screen } from '@testing-library/react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';

describe('AmbiguousAddressSheet', () => {
  it('should render correctly', () => {
    renderScreen(AmbiguousAddressSheet, {
      name: Routes.SHEET.AMBIGUOUS_ADDRESS,
    });
    expect(
      screen.getByText(strings('duplicate_address.title')),
    ).toBeOnTheScreen();
  });
});
