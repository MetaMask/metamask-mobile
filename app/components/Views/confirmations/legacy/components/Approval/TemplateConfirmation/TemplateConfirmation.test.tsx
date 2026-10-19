import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TemplateConfirmation, {
  TemplateConfirmationProps,
} from './TemplateConfirmation';
import { ApprovalTypes } from '../../../../../../../core/RPCMethods/RPCMethodMiddleware';
import { getTemplateValues } from './Templates';

jest.mock('./Templates', () => ({
  getTemplateValues: jest.fn(),
}));

const CONTENT_MOCK = 'CONTENT_MOCK';
const CANCEL_TEXT_MOCK = 'CANCEL_TEXT_MOCK';
const CONFIRM_TEXT_MOCK = 'CONFIRM_TEXT_MOCK';

describe('TemplateConfirmation', () => {
  const mockOnConfirm = jest.fn();
  const mockOnCancel = jest.fn();

  const mockProps: TemplateConfirmationProps = {
    approvalRequest: {
      id: 'mocked',
      origin: 'metamask',
      requestData: {
        data: '123',
      },
      type: ApprovalTypes.RESULT_SUCCESS,
      expectsResult: false,
      requestState: null,
      time: 123456,
    },
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders content and actions', () => {
    (getTemplateValues as jest.Mock).mockReturnValue({
      content: [CONTENT_MOCK],
      cancelText: CANCEL_TEXT_MOCK,
      confirmText: CONFIRM_TEXT_MOCK,
    });
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    expect(wrapper.getByText(CONTENT_MOCK)).toBeOnTheScreen();
    expect(wrapper.getByText(CANCEL_TEXT_MOCK)).toBeOnTheScreen();
    expect(wrapper.getByText(CONFIRM_TEXT_MOCK)).toBeOnTheScreen();
  });

  it('renders content without actions', () => {
    (getTemplateValues as jest.Mock).mockReturnValue({
      content: [CONTENT_MOCK],
      cancelText: CANCEL_TEXT_MOCK,
      confirmText: CONFIRM_TEXT_MOCK,
      hideSubmitButton: true,
      hideCancelButton: true,
    });
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    expect(wrapper.getByText(CONTENT_MOCK)).toBeOnTheScreen();
    expect(wrapper.queryByText(CANCEL_TEXT_MOCK)).toBeNull();
    expect(wrapper.queryByText(CONFIRM_TEXT_MOCK)).toBeNull();
  });

  it('calls onConfirm when the primary button is pressed', () => {
    (getTemplateValues as jest.Mock).mockReturnValue({
      content: [CONTENT_MOCK],
      cancelText: CANCEL_TEXT_MOCK,
      confirmText: CONFIRM_TEXT_MOCK,
    });
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    fireEvent.press(wrapper.getByRole('button', { name: CONFIRM_TEXT_MOCK }));

    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when the secondary button is pressed', () => {
    (getTemplateValues as jest.Mock).mockReturnValue({
      content: [CONTENT_MOCK],
      cancelText: CANCEL_TEXT_MOCK,
      confirmText: CONFIRM_TEXT_MOCK,
    });
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    fireEvent.press(wrapper.getByRole('button', { name: CANCEL_TEXT_MOCK }));

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('calls template onConfirm/onCancel handlers when provided', () => {
    const templateOnConfirm = jest.fn();
    const templateOnCancel = jest.fn();
    (getTemplateValues as jest.Mock).mockReturnValue({
      content: [CONTENT_MOCK],
      cancelText: CANCEL_TEXT_MOCK,
      confirmText: CONFIRM_TEXT_MOCK,
      onConfirm: templateOnConfirm,
      onCancel: templateOnCancel,
    });
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    fireEvent.press(wrapper.getByRole('button', { name: CONFIRM_TEXT_MOCK }));
    fireEvent.press(wrapper.getByRole('button', { name: CANCEL_TEXT_MOCK }));

    expect(templateOnConfirm).toHaveBeenCalledTimes(1);
    expect(templateOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
    expect(mockOnCancel).not.toHaveBeenCalled();
  });

  it('renders only the primary button when cancel is hidden', () => {
    (getTemplateValues as jest.Mock).mockReturnValue({
      content: [CONTENT_MOCK],
      confirmText: CONFIRM_TEXT_MOCK,
      hideCancelButton: true,
    });
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    expect(
      wrapper.getByRole('button', { name: CONFIRM_TEXT_MOCK }),
    ).toBeOnTheScreen();
    expect(
      wrapper.queryByRole('button', { name: CANCEL_TEXT_MOCK }),
    ).toBeNull();
  });

  it('renders only the secondary button when submit is hidden', () => {
    (getTemplateValues as jest.Mock).mockReturnValue({
      content: [CONTENT_MOCK],
      cancelText: CANCEL_TEXT_MOCK,
      hideSubmitButton: true,
    });
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    expect(
      wrapper.getByRole('button', { name: CANCEL_TEXT_MOCK }),
    ).toBeOnTheScreen();
    expect(
      wrapper.queryByRole('button', { name: CONFIRM_TEXT_MOCK }),
    ).toBeNull();
  });

  it('falls back to default confirm and cancel labels', () => {
    (getTemplateValues as jest.Mock).mockReturnValue({
      content: [CONTENT_MOCK],
    });
    const wrapper = render(<TemplateConfirmation {...mockProps} />);

    expect(wrapper.getByRole('button', { name: 'OK' })).toBeOnTheScreen();
    expect(wrapper.getByRole('button', { name: 'Cancel' })).toBeOnTheScreen();
  });
});
