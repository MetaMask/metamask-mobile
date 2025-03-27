import { renderScreen } from '../../../util/test/renderWithProvider';
import { BridgeTokenSelector } from './BridgeTokenSelector';
import Routes from '../../../constants/navigation/Routes';

describe('BridgeTokenSelector', () => {
  it('renders', () => {
    const { getByText } = renderScreen(
      BridgeTokenSelector,
      {
        name: Routes.SHEET.BRIDGE_TOKEN_SELECTOR,
      },
    );

    expect(getByText('Tokens')).toBeTruthy();
    expect(getByText('Token content will go here')).toBeTruthy();
  });
});
