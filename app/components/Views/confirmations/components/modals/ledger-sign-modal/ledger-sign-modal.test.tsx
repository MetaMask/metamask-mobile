import React from 'react';
import { Button, Text, View } from 'react-native';
import { fireEvent } from '@testing-library/react-native';

// eslint-disable-next-line import/no-namespace
import * as rpcEventsFuncs from '../../../../../../actions/rpcEvents';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
// eslint-disable-next-line import/no-namespace
import * as ConfirmationActions from '../../../hooks/useConfirmActions';

import LedgerSignModal from './ledger-sign-modal';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useConfirmActions', () => ({
  useConfirmActions: jest.fn(() => ({
    onConfirm: jest.fn(),
    onReject: jest.fn(),
  })),
}));

const mockDeviceId = 'MockDeviceId';
const mockCloseLedgerSignModal = jest.fn();
jest.mock('../../../context/ledger-context', () => ({
  useLedgerContext: () => ({
    deviceId: mockDeviceId,
    closeLedgerSignModal: mockCloseLedgerSignModal,
  }),
}));

jest.mock('../../../hooks/gas/useGasFeeToken');

const MockView = View;
const MockText = Text;
const MockButton = Button;
jest.mock('../../../../../UI/LedgerModals/LedgerConfirmationModal', () => ({
  __esModule: true,
  default: ({
    onConfirmation,
    onRejection,
    deviceId,
  }: {
    onConfirmation: () => void;
    onRejection: () => void;
    deviceId: string;
  }) => (
    <MockView>
      <MockText>Mock LedgerConfirmationModal</MockText>
      <MockText>{deviceId}</MockText>
      <MockButton onPress={onConfirmation} title="onConfirmation" />
      <MockButton onPress={onRejection} title="onRejection" />
    </MockView>
  ),
}));

describe('LedgerMessageSignModal', () => {
  it('should render LedgerConfirmationModal correctly', () => {
    const { getByText } = renderWithProvider(<LedgerSignModal />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Mock LedgerConfirmationModal')).toBeTruthy();
    expect(getByText(mockDeviceId)).toBeTruthy();
  });

  it('should call onConfirm when request is confirmed', () => {
    const mockOnConfirm = jest.fn();
    jest.spyOn(ConfirmationActions, 'useConfirmActions').mockReturnValue({
      onConfirm: mockOnConfirm,
      onReject: jest.fn(),
    });
    const { getByText } = renderWithProvider(<LedgerSignModal />, {
      state: personalSignatureConfirmationState,
    });
    fireEvent.press(getByText('onConfirmation'));
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onReject when request is rejected', () => {
    const mockOnReject = jest.fn();
    jest.spyOn(ConfirmationActions, 'useConfirmActions').mockReturnValue({
      onConfirm: jest.fn(),
      onReject: mockOnReject,
    });
    jest
      .spyOn(rpcEventsFuncs, 'resetEventStage')
      .mockImplementation(() => ({ rpcName: 'dummy', type: 'DUMMY' }));
    const { getByText } = renderWithProvider(<LedgerSignModal />, {
      state: personalSignatureConfirmationState,
    });
    fireEvent.press(getByText('onRejection'));
    expect(mockOnReject).toHaveBeenCalledTimes(1);
    expect(rpcEventsFuncs.resetEventStage).toHaveBeenCalledTimes(1);
    expect(mockCloseLedgerSignModal).toHaveBeenCalledTimes(1);
  });
});
