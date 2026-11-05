import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import VbaVerifyIdentity from './VerifyIdentity';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import { TermsSectionTitle } from './IdentityTermsComponents';
import {
  METAMASK_PRIVACY_NOTICE_URL,
  METAMASK_TERMS_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import { trackVbaEvent } from '../../../Ramp/Views/VirtualBankAccount/vbaAnalytics';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';

jest.mock('../../../Ramp/Views/VirtualBankAccount/vbaAnalytics', () => ({
  ...jest.requireActual('../../../Ramp/Views/VirtualBankAccount/vbaAnalytics'),
  trackVbaEvent: jest.fn(),
}));

jest.mock('../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);
const mockOnContinue = jest.fn();

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

const renderScreen = () =>
  renderWithProvider(<VbaVerifyIdentity onContinue={mockOnContinue} />);

const METAMASK_CONSENT_LINE =
  'By tapping Agree and continue, I agree to the MetaMask Terms of Use, acknowledge the MetaMask Privacy Notice and consent to MetaMask transferring my information to idOS.';

describe('VbaVerifyIdentity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders screen 1 of 2 with the steps and the idOS benefits', () => {
    const { getByText, getByTestId } = renderScreen();

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.STEP_COUNTER),
    ).toHaveTextContent('Step 1 of 2', { exact: true });
    [
      'Verify your identity',
      "This usually takes a few minutes. You'll need a government-issued ID.",
      'Photograph your ID',
      'Take a selfie',
      'Confirm your details',
      'Answer a few questions',
      'We partner with idOS to verify your identity.',
      'Verify once, reuse later.',
      'MetaMask securely stores an encrypted copy of your verified identity, so you can sign up with other partners faster.',
      'You control your data.',
      'We share your verified identity with a partner only when you agree.',
      'Delete anytime.',
    ].forEach((text) => expect(getByText(text)).toBeOnTheScreen());
    expect(
      getByTestId(`${VbaVerifyIdentitySelectorsIDs.BENEFIT}-delete`),
    ).toHaveTextContent(
      'Delete anytime.Delete your verified identity anytime in Settings.',
    );
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: KYC_SCREEN_PERFORMANCE_CONFIG,
      screenId: KYC_SCREEN_ID.IDENTITY_VERIFICATION_TERMS,
      contentReady: true,
      contentState: KYC_SCREEN_CONTENT_STATE.POPULATED,
    });
  });

  it('renders the MetaMask consent line with the exact text of its button', () => {
    const { getByTestId } = renderScreen();

    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_AGREEMENT),
    ).toHaveTextContent(METAMASK_CONSENT_LINE, { exact: true });
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON),
    ).toHaveTextContent('Agree and continue', { exact: true });
  });

  it('names neither Sumsub nor the idOS terms and has no consent checkbox', () => {
    const { queryByText, queryAllByRole } = renderScreen();

    expect(queryByText(/Sumsub/)).not.toBeOnTheScreen();
    expect(queryByText(/idOS Terms and Conditions/)).not.toBeOnTheScreen();
    expect(queryByText(/Powered by/)).not.toBeOnTheScreen();
    expect(queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('keeps Agree and continue enabled and goes to screen 2 when pressed', () => {
    const { getByTestId } = renderScreen();
    const continueButton = getByTestId(
      VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON,
    );

    expect(continueButton).toBeEnabled();
    fireEvent.press(continueButton);

    expect(mockOnContinue).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('has no MetaMask terms card, since the consent line links both documents', () => {
    const { queryByText, getAllByText, getByTestId } = renderScreen();

    expect(queryByText('MetaMask terms')).toBeNull();
    // Each document is named once: in the consent line, not in a row too.
    expect(getAllByText('Terms of Use')).toHaveLength(1);
    expect(getAllByText('Privacy Notice')).toHaveLength(1);
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK),
    ).toHaveTextContent('Terms of Use', { exact: true });
    expect(
      getByTestId(VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_NOTICE_LINK),
    ).toHaveTextContent('Privacy Notice', { exact: true });
  });

  it('opens the MetaMask Terms of Use and Privacy Notice from the consent line', () => {
    const openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockResolvedValue(undefined);
    const { getByTestId } = renderScreen();

    [
      VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK,
      VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_NOTICE_LINK,
    ].forEach((testID) => fireEvent.press(getByTestId(testID)));

    expect(openUrlSpy.mock.calls).toEqual([
      [METAMASK_TERMS_URL],
      [METAMASK_PRIVACY_NOTICE_URL],
    ]);
    expect(METAMASK_TERMS_URL).toBe('https://metamask.com/terms-of-use');
    expect(METAMASK_PRIVACY_NOTICE_URL).toBe(
      'https://metamask.com/privacy-notice',
    );
    expect(mockOnContinue).not.toHaveBeenCalled();
  });

  it('styles the idOS partners heading as a terms section title', () => {
    const { getByText } = renderScreen();
    const sectionTitle = render(
      <TermsSectionTitle>Section title</TermsSectionTitle>,
    ).getByText('Section title');

    expect(
      getByText('We partner with idOS to verify your identity.').props.style,
    ).toStrictEqual(sectionTitle.props.style);
  });

  it('shows the delete benefit as plain text with no Learn more link', () => {
    const { getByText, queryByText } = renderScreen();

    expect(
      getByText('Delete your verified identity anytime in Settings.'),
    ).toBeOnTheScreen();
    expect(queryByText(/Learn more/)).toBeNull();
  });

  it('exits the flow to Money home when the header back button is pressed', () => {
    const { getByTestId } = renderScreen();

    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockOnContinue).not.toHaveBeenCalled();
  });

  it('tracks viewed once when the screen opens, and nothing on continue', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId(VbaVerifyIdentitySelectorsIDs.CONTINUE_BUTTON));

    const identityTermsProperties = jest
      .mocked(trackVbaEvent)
      .mock.calls.filter(
        ([event]) => event.category === 'KYC Identity Terms Updated',
      )
      .map(([, buildProperties]) => buildProperties());

    expect(identityTermsProperties.map(({ status }) => status)).toStrictEqual([
      'viewed',
    ]);
    expect(identityTermsProperties[0]).toMatchObject({
      screen_name: 'vba_onboarding',
      kyc_provider: 'sumsub',
    });
  });
});
