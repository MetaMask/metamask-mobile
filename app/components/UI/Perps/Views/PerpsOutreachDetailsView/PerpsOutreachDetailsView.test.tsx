import React from 'react';
import { Linking, Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import {
  BottomSheetFooter,
  ButtonsAlignment,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { EXTERNAL_LINK_TYPE } from '../../../../../constants/browser';
import { usePerpsOutreachBanner } from '../../hooks/usePerpsOutreachBanner';
import PerpsOutreachDetailsView from './PerpsOutreachDetailsView';
import { PerpsOutreachDetailsViewSelectorsIDs } from './PerpsOutreachDetailsView.testIds';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const CONTACT = {
  email: 'vip@example.com',
  telegramUsername: '@vip_trader',
  calendlyUrl: 'https://calendly.com/vip-team/30min',
};
const CAMPAIGN = {
  id: 'mobile-outreach-test',
  title: 'Test title',
  body: 'Test body',
  imageUrl: 'https://example.com/banner.png',
  linkUrl: 'https://link.metamask.io/perps-outreach',
  contact: CONTACT,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({ goBack: mockGoBack, navigate: mockNavigate }),
  };
});

jest.mock('../../hooks/usePerpsOutreachBanner');

// Avoid the reanimated worklet setup for a static sheet render.
jest.mock('react-native-reanimated', () =>
  jest.requireActual('react-native-reanimated/mock'),
);

// The bottom sheet closes before navigating; run goBack + the close callback
// synchronously so assertions see the same order as the real DSRN sheet
// (`goBack` prop first, then the postCallback).
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactModule = jest.requireActual('react');
  const { View: RNView } = jest.requireActual('react-native');
  return {
    ...actual,
    BottomSheet: ReactModule.forwardRef(
      (
        {
          children,
          goBack,
          style,
          collapsable,
          testID,
        }: {
          children: React.ReactNode;
          goBack?: () => void;
          style?: React.ComponentProps<typeof RNView>['style'];
          collapsable?: boolean;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
      ) => {
        ReactModule.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: (cb?: () => void) => {
            goBack?.();
            cb?.();
          },
        }));
        return (
          <RNView testID={testID} style={style} collapsable={collapsable}>
            {children}
          </RNView>
        );
      },
    ),
  };
});

describe('PerpsOutreachDetailsView', () => {
  let openUrlSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.mocked(usePerpsOutreachBanner).mockReturnValue({
      data: CAMPAIGN,
    } as ReturnType<typeof usePerpsOutreachBanner>);
    openUrlSpy = jest
      .spyOn(Linking, 'openURL')
      .mockImplementation(() => Promise.resolve());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the campaign copy, the four value bullets, and the contact email', () => {
    const { getByText, getByTestId } = render(<PerpsOutreachDetailsView />);

    expect(
      getByText(strings('perps.outreach_details.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('perps.outreach_details.subtitle')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsOutreachDetailsViewSelectorsIDs.FEATURE_VIP),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsOutreachDetailsViewSelectorsIDs.FEATURE_SUPPORT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsOutreachDetailsViewSelectorsIDs.FEATURE_ROADMAP),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsOutreachDetailsViewSelectorsIDs.FEATURE_TRIP),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PerpsOutreachDetailsViewSelectorsIDs.CONTACT_TEXT),
    ).toHaveTextContent(
      strings('perps.outreach_details.contact', {
        telegramHandle: CONTACT.telegramUsername,
        email: CONTACT.email,
      }),
    );
    expect(getByText(CONTACT.email)).toBeOnTheScreen();
  });

  it('opens Telegram externally so the Universal Link hands off to the app', () => {
    // Universal Links are not intercepted inside a WebView — routing through
    // the in-app browser would leave the user on the t.me web fallback with
    // a "Open in Telegram" tap on top. Using the OS launcher hands the URL to
    // Telegram directly when installed.
    const { getByTestId } = render(<PerpsOutreachDetailsView />);

    fireEvent.press(
      getByTestId(PerpsOutreachDetailsViewSelectorsIDs.TELEGRAM_BUTTON),
    );

    expect(openUrlSpy).toHaveBeenCalledWith('https://t.me/vip_trader');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens Calendly inside the in-app browser when the primary button is pressed', () => {
    const { getByTestId } = render(<PerpsOutreachDetailsView />);

    fireEvent.press(
      getByTestId(PerpsOutreachDetailsViewSelectorsIDs.SCHEDULE_BUTTON),
    );

    // BottomSheet's `goBack` prop pops the modal once; the post-callback
    // then opens the browser. A second goBack in the callback would pop the
    // Perps page underneath and leave the user on the wrong screen.
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME, {
      screen: Routes.BROWSER.VIEW,
      params: expect.objectContaining({
        newTabUrl: CONTACT.calendlyUrl,
        linkType: EXTERNAL_LINK_TYPE,
      }),
    });
    expect(mockGoBack.mock.invocationCallOrder[0]).toBeLessThan(
      mockNavigate.mock.invocationCallOrder[0],
    );
  });

  it('pops only the modal when the close icon is pressed', () => {
    // Regression: handleClose used to pass navigation.goBack as the
    // onCloseBottomSheet callback while goBack={navigation.goBack} was also
    // wired, so the modal AND the underlying Perps page were both popped.
    const { getByTestId } = render(<PerpsOutreachDetailsView />);

    fireEvent.press(
      getByTestId(PerpsOutreachDetailsViewSelectorsIDs.CLOSE_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('opens a mailto link externally when the contact email is pressed', () => {
    const { getByTestId } = render(<PerpsOutreachDetailsView />);

    fireEvent.press(
      getByTestId(PerpsOutreachDetailsViewSelectorsIDs.CONTACT_EMAIL),
    );

    // mailto has to leave the app — the in-app browser is web-only.
    expect(openUrlSpy).toHaveBeenCalledWith(`mailto:${CONTACT.email}`);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('renders icon-free buttons in one row', () => {
    const { UNSAFE_getByType } = render(<PerpsOutreachDetailsView />);

    const footer = UNSAFE_getByType(BottomSheetFooter);

    expect(footer.props.buttonsAlignment).toBe(ButtonsAlignment.Horizontal);
    expect(footer.props.secondaryButtonProps.startIconName).toBeUndefined();
    expect(footer.props.primaryButtonProps.startIconName).toBeUndefined();
  });

  describe('safe area', () => {
    const originalPlatform = Platform.OS;

    afterEach(() => {
      Platform.OS = originalPlatform;
    });

    it('measures the modal window on Android so the footer clears the navigation bar', () => {
      Platform.OS = 'android';

      const { getByTestId } = render(<PerpsOutreachDetailsView />);

      expect(
        getByTestId(PerpsOutreachDetailsViewSelectorsIDs.SAFE_AREA),
      ).toBeOnTheScreen();
      expect(
        getByTestId(PerpsOutreachDetailsViewSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });

    it('keeps the root inset source on iOS', () => {
      Platform.OS = 'ios';

      const { queryByTestId, getByTestId } = render(
        <PerpsOutreachDetailsView />,
      );

      expect(
        queryByTestId(PerpsOutreachDetailsViewSelectorsIDs.SAFE_AREA),
      ).toBeNull();
      expect(
        getByTestId(PerpsOutreachDetailsViewSelectorsIDs.SHEET),
      ).toBeOnTheScreen();
    });
  });

  it('hides contact actions when the backend omits contact configuration', () => {
    jest.mocked(usePerpsOutreachBanner).mockReturnValue({
      data: { ...CAMPAIGN, contact: null },
    } as ReturnType<typeof usePerpsOutreachBanner>);

    const { queryByTestId, UNSAFE_queryByType } = render(
      <PerpsOutreachDetailsView />,
    );

    expect(
      queryByTestId(PerpsOutreachDetailsViewSelectorsIDs.CONTACT_EMAIL),
    ).not.toBeOnTheScreen();
    expect(UNSAFE_queryByType(BottomSheetFooter)).not.toBeOnTheScreen();
  });
});
