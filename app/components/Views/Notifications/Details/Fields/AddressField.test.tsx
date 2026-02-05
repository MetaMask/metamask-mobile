import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import AddressField from './AddressField';
import { EVENT_NAME } from '../../../../../core/Analytics/MetaMetrics.events';
import { CopyClipboardAlertMessage } from '../hooks/useCopyClipboard';
import { ModalFieldType } from '../../../../../util/notifications/constants';
import { ModalFieldAddress } from '../../../../../util/notifications/notification-states/types/NotificationModalDetails';

const TEST_ADDRESS = '0x1234567890123456789012345678901234567890';
const TEST_LABEL = 'From';

const mockCopyToClipboard = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnValue({
    build: jest.fn().mockReturnValue({}),
  }),
});

jest.mock('../hooks/useCopyClipboard', () => ({
  __esModule: true,
  default: () => mockCopyToClipboard,
  CopyClipboardAlertMessage: {
    address: jest.fn().mockReturnValue('Address copied to clipboard'),
  },
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../useStyles', () => ({
  __esModule: true,
  default: () => ({
    styles: {
      row: {},
      badgeWrapper: {},
      boxLeft: {},
      copyContainer: {},
      addressLinkLabel: {},
      copyIconDefault: {},
    },
  }),
}));

describe('AddressField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderAddressField = (props: Partial<ModalFieldAddress> = {}) => {
    const defaultProps: ModalFieldAddress = {
      type: ModalFieldType.ADDRESS,
      label: TEST_LABEL,
      address: TEST_ADDRESS,
    };

    return renderWithProvider(<AddressField {...defaultProps} {...props} />, {
      state: {},
    });
  };

  it('renders correctly with label and address', () => {
    const { getByText } = renderAddressField();

    expect(getByText(TEST_LABEL)).toBeDefined();
  });

  describe('handleCopy', () => {
    it('calls copyToClipboard with correct address and message when pressed', async () => {
      const { getByTestId } = renderAddressField();

      // Find and press the copy button
      const copyButton = getByTestId('address-field-copy-button');
      fireEvent.press(copyButton);

      await new Promise(process.nextTick);

      expect(mockCopyToClipboard).toHaveBeenCalledWith(
        TEST_ADDRESS,
        'Address copied to clipboard',
      );
    });

    it('tracks "ADDRESS_COPIED" event when copy button is pressed', async () => {
      const { getByTestId } = renderAddressField();

      // Find and press the copy button
      const copyButton = getByTestId('address-field-copy-button');
      fireEvent.press(copyButton);

      await new Promise(process.nextTick);

      // Verify createEventBuilder was called with correct event name
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        EVENT_NAME.ADDRESS_COPIED,
      );

      // Verify trackEvent was called
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('adds correct properties with location "notification-details"', async () => {
      const { getByTestId } = renderAddressField();

      // Find and press the copy button
      const copyButton = getByTestId('address-field-copy-button');
      fireEvent.press(copyButton);

      await new Promise(process.nextTick);

      // Verify addProperties was called with correct properties
      const mockEventBuilder = mockCreateEventBuilder.mock.results[0].value;
      expect(mockEventBuilder.addProperties).toHaveBeenCalledWith({
        location: 'notification-details',
      });

      // Verify build was called
      expect(mockEventBuilder.addProperties().build).toHaveBeenCalled();
    });

    it('calls CopyClipboardAlertMessage.address() to get message', async () => {
      const { getByTestId } = renderAddressField();

      // Find and press the copy button
      const copyButton = getByTestId('address-field-copy-button');
      fireEvent.press(copyButton);

      await new Promise(process.nextTick);

      expect(CopyClipboardAlertMessage.address).toHaveBeenCalled();
    });
  });
});
