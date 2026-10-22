import React from 'react';
import { Linking } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import SecuritySocialSection from './SecuritySocialSection';
import { SecuritySocialSectionSelectors } from './SecuritySocialSection.testIds';
import { SecurityPillSelectors } from '../SecurityPill/SecurityPill.testIds';

const mockCopyAddress = jest.fn();
jest.mock('../../../hooks/useCopyTokenContractAddress', () => ({
  useCopyTokenContractAddress: () => mockCopyAddress,
}));

const PEPE_ADDRESS = '0x6982508145454Ce325dDbE47a25d4ec3d2311933';

const EXTERNAL_LINKS = {
  homepage: 'https://pepe.vip',
  twitterPage: 'pepecoineth',
  telegramChannelId: 'pepecoineth',
};

describe('SecuritySocialSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  it('renders the row with the security verdict it is given', () => {
    const { getByTestId, getByText } = render(
      <SecuritySocialSection securityVerdict="unscreened" />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.SECTION),
    ).toBeOnTheScreen();
    expect(getByText('Unscreened')).toBeOnTheScreen();
  });

  it('forwards the security press handler to the pill', () => {
    const onSecurityPress = jest.fn();
    const { getByTestId } = render(
      <SecuritySocialSection
        securityVerdict="screened"
        onSecurityPress={onSecurityPress}
      />,
    );

    fireEvent.press(getByTestId(SecurityPillSelectors.PILL));

    expect(onSecurityPress).toHaveBeenCalledTimes(1);
  });

  it('renders a button for every link the token has', () => {
    const { getByTestId } = render(
      <SecuritySocialSection
        securityVerdict="screened"
        externalLinks={EXTERNAL_LINKS}
      />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_X),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_WEBSITE),
    ).toBeOnTheScreen();
    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_TELEGRAM),
    ).toBeOnTheScreen();
  });

  // Every field of externalLinks is independently nullable, so a token with a
  // website but no socials must not render empty buttons.
  it('omits the buttons whose link is missing', () => {
    const { getByTestId, queryByTestId } = render(
      <SecuritySocialSection
        securityVerdict="screened"
        externalLinks={{
          homepage: 'https://pepe.vip',
          twitterPage: null,
          telegramChannelId: null,
        }}
      />,
    );

    expect(
      getByTestId(SecuritySocialSectionSelectors.LINK_WEBSITE),
    ).toBeOnTheScreen();
    expect(queryByTestId(SecuritySocialSectionSelectors.LINK_X)).toBeNull();
    expect(
      queryByTestId(SecuritySocialSectionSelectors.LINK_TELEGRAM),
    ).toBeNull();
  });

  it('renders no link buttons when the token has no security metadata', () => {
    const { queryByTestId } = render(
      <SecuritySocialSection securityVerdict="pending" />,
    );

    expect(queryByTestId(SecuritySocialSectionSelectors.LINK_X)).toBeNull();
    expect(
      queryByTestId(SecuritySocialSectionSelectors.LINK_WEBSITE),
    ).toBeNull();
    expect(
      queryByTestId(SecuritySocialSectionSelectors.LINK_TELEGRAM),
    ).toBeNull();
  });

  // The API returns bare handles for X and Telegram, so the component owns the
  // URL, while the homepage arrives ready to open.
  it.each([
    [SecuritySocialSectionSelectors.LINK_X, 'https://x.com/pepecoineth'],
    [SecuritySocialSectionSelectors.LINK_TELEGRAM, 'https://t.me/pepecoineth'],
    [SecuritySocialSectionSelectors.LINK_WEBSITE, 'https://pepe.vip'],
  ])('opens %s at %s', (testID, expectedUrl) => {
    const { getByTestId } = render(
      <SecuritySocialSection
        securityVerdict="screened"
        externalLinks={EXTERNAL_LINKS}
      />,
    );

    fireEvent.press(getByTestId(testID));

    expect(Linking.openURL).toHaveBeenCalledWith(expectedUrl);
  });

  it('copies the contract address from the chip', () => {
    const { getByTestId } = render(
      <SecuritySocialSection
        securityVerdict="screened"
        contractAddress={PEPE_ADDRESS}
      />,
    );

    fireEvent.press(getByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS));

    expect(mockCopyAddress).toHaveBeenCalledTimes(1);
  });

  it('shows the address shortened on the chip', () => {
    const { getByText } = render(
      <SecuritySocialSection
        securityVerdict="screened"
        contractAddress={PEPE_ADDRESS}
      />,
    );

    expect(getByText('0x...1933')).toBeOnTheScreen();
  });

  // The chip only ever shows four characters, so the full address has to stay
  // reachable for anyone verifying the contract by ear.
  it('exposes the full address to screen readers', () => {
    const { getByLabelText } = render(
      <SecuritySocialSection
        securityVerdict="screened"
        contractAddress={PEPE_ADDRESS}
      />,
    );

    expect(
      getByLabelText(`Copy contract address ${PEPE_ADDRESS}`),
    ).toBeOnTheScreen();
  });

  it('hides the copy chip when the token has no contract address', () => {
    const { queryByTestId } = render(
      <SecuritySocialSection securityVerdict="screened" />,
    );

    expect(
      queryByTestId(SecuritySocialSectionSelectors.COPY_ADDRESS),
    ).toBeNull();
  });
});
