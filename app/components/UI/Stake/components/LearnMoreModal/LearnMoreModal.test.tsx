import { fireEvent, screen } from '@testing-library/react-native';
import LearnMoreModal from '.';
import { POOLED_STAKING_FAQ_URL } from '../../constants';
import Routes from '../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';

const renderLearnMoreModal = () =>
  renderScreen(LearnMoreModal, { name: Routes.STAKING.MODALS.LEARN_MORE });

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('LearnMoreModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with headings and text blocks', () => {
    renderLearnMoreModal();
    // Verifying that the main content is rendered
    expect(screen.getByText(strings('stake.stake_eth_and_earn'))).toBeTruthy();
    expect(
      screen.getByText(strings('stake.stake_any_amount_of_eth')),
    ).toBeTruthy();
    expect(screen.getByText(strings('stake.no_minimum_required'))).toBeTruthy();
    expect(screen.getByText(strings('stake.earn_eth_rewards'))).toBeTruthy();
    expect(
      screen.getByText(strings('stake.earn_eth_rewards_description')),
    ).toBeTruthy();
    expect(screen.getByText(strings('stake.flexible_unstaking'))).toBeTruthy();
    expect(
      screen.getByText(strings('stake.flexible_unstaking_description')),
    ).toBeTruthy();
    expect(screen.getByText(strings('stake.disclaimer'))).toBeTruthy();
  });

  it('navigates to FAQ page when "Learn More" button is pressed', () => {
    renderLearnMoreModal();
    // Simulate pressing the "Learn More" button
    fireEvent.press(screen.getByText(strings('stake.learn_more')));

    // Assert that navigate is called with the correct parameters
    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: { url: POOLED_STAKING_FAQ_URL },
    });
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderLearnMoreModal();
    expect(toJSON()).toMatchSnapshot();
  });
});
