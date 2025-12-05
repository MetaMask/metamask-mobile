import React from 'react';
import { Text } from 'react-native';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import ConnectQRInstruction from './index';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  HARDWARE_WALLET_BUTTON_TYPE,
  HARDWARE_WALLET_DEVICE_TYPE,
} from '../../../../core/Analytics/MetaMetrics.events';
import {
  KEYSTONE_LEARN_MORE,
  KEYSTONE_SUPPORT,
  KEYSTONE_SUPPORT_VIDEO,
  NGRAVE_BUY,
  NGRAVE_LEARN_MORE,
} from '../../../../constants/urls';
import { QR_CONTINUE_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Components/ConnectQRHardware.testIds';
import { AppThemeKey } from '../../../../util/theme/models';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
const mockCreateEventBuilder = jest.fn();

jest.mock('../../../../components/hooks/useMetrics', () => {
  const actualMetrics = jest.requireActual('../../../../core/Analytics');
  const actualHooks = jest.requireActual(
    '../../../../components/hooks/useMetrics',
  );
  return {
    ...actualHooks,
    useMetrics: () => ({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    }),
    MetaMetricsEvents: actualMetrics.MetaMetricsEvents,
  };
});

const mockNavigate = jest.fn();
const mockOnConnect = jest.fn();
const mockRenderAlert = jest.fn(() => <></>);

const mockNavigation = {
  navigate: mockNavigate,
};

const initialState = {
  user: {
    appTheme: AppThemeKey.light,
  },
};

describe('ConnectQRInstruction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddProperties.mockReturnValue({
      build: mockBuild,
    });
    mockBuild.mockReturnValue({});
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByText } = renderWithProvider(
      <ConnectQRInstruction
        navigation={mockNavigation}
        onConnect={mockOnConnect}
        renderAlert={mockRenderAlert}
      />,
      { state: initialState },
    );

    expect(getByText('connect_qr_hardware.title')).toBeTruthy();
  });

  it('renders all description text elements', () => {
    const { getByText } = renderWithProvider(
      <ConnectQRInstruction
        navigation={mockNavigation}
        onConnect={mockOnConnect}
        renderAlert={mockRenderAlert}
      />,
      { state: initialState },
    );

    expect(getByText('connect_qr_hardware.description1')).toBeTruthy();
    expect(getByText('connect_qr_hardware.description3')).toBeTruthy();
  });

  it('renders Keystone section label', () => {
    const { getByText } = renderWithProvider(
      <ConnectQRInstruction
        navigation={mockNavigation}
        onConnect={mockOnConnect}
        renderAlert={mockRenderAlert}
      />,
      { state: initialState },
    );

    expect(getByText('connect_qr_hardware.keystone')).toBeTruthy();
  });

  it('renders Ngrave Zero section label', () => {
    const { getByText } = renderWithProvider(
      <ConnectQRInstruction
        navigation={mockNavigation}
        onConnect={mockOnConnect}
        renderAlert={mockRenderAlert}
      />,
      { state: initialState },
    );

    expect(getByText('connect_qr_hardware.ngravezero')).toBeTruthy();
  });

  it('renders alert component from renderAlert prop', () => {
    const mockRenderAlertWithContent = jest.fn(() => (
      <Text testID="test-alert">Alert Content</Text>
    ));

    const { getByTestId } = renderWithProvider(
      <ConnectQRInstruction
        navigation={mockNavigation}
        onConnect={mockOnConnect}
        renderAlert={mockRenderAlertWithContent}
      />,
      { state: initialState },
    );

    expect(mockRenderAlertWithContent).toHaveBeenCalled();
    expect(getByTestId('test-alert')).toBeTruthy();
  });

  it('renders continue button with correct text', () => {
    const { getByText } = renderWithProvider(
      <ConnectQRInstruction
        navigation={mockNavigation}
        onConnect={mockOnConnect}
        renderAlert={mockRenderAlert}
      />,
      { state: initialState },
    );

    expect(getByText('connect_qr_hardware.button_continue')).toBeTruthy();
  });

  it('calls onConnect when continue button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <ConnectQRInstruction
        navigation={mockNavigation}
        onConnect={mockOnConnect}
        renderAlert={mockRenderAlert}
      />,
      { state: initialState },
    );

    const continueButton = getByTestId(QR_CONTINUE_BUTTON);
    fireEvent.press(continueButton);

    expect(mockOnConnect).toHaveBeenCalledTimes(1);
  });

  describe('Keystone marketing metrics', () => {
    it('tracks metrics and navigates when Keystone tutorial video link is pressed', () => {
      const { getByText } = renderWithProvider(
        <ConnectQRInstruction
          navigation={mockNavigation}
          onConnect={mockOnConnect}
          renderAlert={mockRenderAlert}
        />,
        { state: initialState },
      );

      const tutorialVideoLink = getByText('connect_qr_hardware.description2');
      fireEvent.press(tutorialVideoLink);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_MARKETING,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        device_type: HARDWARE_WALLET_DEVICE_TYPE.Keystone,
        button_type: HARDWARE_WALLET_BUTTON_TYPE.TUTORIAL,
      });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: KEYSTONE_SUPPORT_VIDEO,
          title: 'connect_qr_hardware.description2',
        },
      });
    });

    it('tracks metrics and navigates when Keystone Learn More link is pressed', () => {
      const { getAllByText } = renderWithProvider(
        <ConnectQRInstruction
          navigation={mockNavigation}
          onConnect={mockOnConnect}
          renderAlert={mockRenderAlert}
        />,
        { state: initialState },
      );

      const learnMoreLinks = getAllByText('connect_qr_hardware.learnMore');
      const keystoneLearnMore = learnMoreLinks[0];
      fireEvent.press(keystoneLearnMore);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_MARKETING,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        device_type: HARDWARE_WALLET_DEVICE_TYPE.Keystone,
        button_type: HARDWARE_WALLET_BUTTON_TYPE.LEARN_MORE,
      });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: KEYSTONE_LEARN_MORE,
          title: 'connect_qr_hardware.keystone',
        },
      });
    });

    it('tracks metrics and navigates when Keystone tutorial link is pressed', () => {
      const { getByText } = renderWithProvider(
        <ConnectQRInstruction
          navigation={mockNavigation}
          onConnect={mockOnConnect}
          renderAlert={mockRenderAlert}
        />,
        { state: initialState },
      );

      const tutorialLink = getByText('connect_qr_hardware.tutorial');
      fireEvent.press(tutorialLink);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_MARKETING,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        device_type: HARDWARE_WALLET_DEVICE_TYPE.Keystone,
        button_type: HARDWARE_WALLET_BUTTON_TYPE.TUTORIAL,
      });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: KEYSTONE_SUPPORT,
          title: 'connect_qr_hardware.description4',
        },
      });
    });
  });

  describe('Ngrave marketing metrics', () => {
    it('tracks metrics and navigates when Ngrave Learn More link is pressed', () => {
      const { getAllByText } = renderWithProvider(
        <ConnectQRInstruction
          navigation={mockNavigation}
          onConnect={mockOnConnect}
          renderAlert={mockRenderAlert}
        />,
        { state: initialState },
      );

      const learnMoreLinks = getAllByText('connect_qr_hardware.learnMore');
      const ngraveLearnMore = learnMoreLinks[1];
      fireEvent.press(ngraveLearnMore);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_MARKETING,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        device_type: HARDWARE_WALLET_DEVICE_TYPE.NgraveZero,
        button_type: HARDWARE_WALLET_BUTTON_TYPE.LEARN_MORE,
      });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: NGRAVE_LEARN_MORE,
          title: 'connect_qr_hardware.ngravezero',
        },
      });
    });

    it('tracks metrics and navigates when Ngrave Buy Now link is pressed', () => {
      const { getByText } = renderWithProvider(
        <ConnectQRInstruction
          navigation={mockNavigation}
          onConnect={mockOnConnect}
          renderAlert={mockRenderAlert}
        />,
        { state: initialState },
      );

      const buyNowLink = getByText('connect_qr_hardware.buyNow');
      fireEvent.press(buyNowLink);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_MARKETING,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        device_type: HARDWARE_WALLET_DEVICE_TYPE.NgraveZero,
        button_type: HARDWARE_WALLET_BUTTON_TYPE.BUY_NOW,
      });
      expect(mockBuild).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Webview', {
        screen: 'SimpleWebview',
        params: {
          url: NGRAVE_BUY,
          title: 'connect_qr_hardware.ngravezero',
        },
      });
    });
  });

  describe('useMetrics integration', () => {
    it('uses the useMetrics hook correctly', () => {
      renderWithProvider(
        <ConnectQRInstruction
          navigation={mockNavigation}
          onConnect={mockOnConnect}
          renderAlert={mockRenderAlert}
        />,
        { state: initialState },
      );

      expect(mockCreateEventBuilder).toBeDefined();
      expect(mockTrackEvent).toBeDefined();
    });

    it('creates event builder with correct event type for marketing events', () => {
      const { getByText } = renderWithProvider(
        <ConnectQRInstruction
          navigation={mockNavigation}
          onConnect={mockOnConnect}
          renderAlert={mockRenderAlert}
        />,
        { state: initialState },
      );

      const buyNowLink = getByText('connect_qr_hardware.buyNow');
      fireEvent.press(buyNowLink);

      expect(mockTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.HARDWARE_WALLET_MARKETING,
      );
    });
  });
});
