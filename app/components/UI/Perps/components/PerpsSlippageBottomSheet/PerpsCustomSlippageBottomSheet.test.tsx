import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import PerpsCustomSlippageBottomSheet from './PerpsCustomSlippageBottomSheet';
import { PerpsCustomSlippageBottomSheetSelectorsIDs } from '../../Perps.testIds';

jest.mock('../../../CustomSlippageBottomSheet', () => {
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      isVisible,
      title,
      value,
      onClose,
      onConfirm,
      primaryButtonTestID,
      secondaryButtonTestID,
      isConfirmDisabled,
    }: {
      isVisible: boolean;
      title: string;
      value: string;
      onClose: () => void;
      onConfirm: (value: string) => void;
      primaryButtonTestID?: string;
      secondaryButtonTestID?: string;
      isConfirmDisabled?: boolean;
    }) =>
      isVisible ? (
        <View>
          <Text>{title}</Text>
          <Text testID="draft-value">{value}</Text>
          <TouchableOpacity testID={secondaryButtonTestID} onPress={onClose} />
          <TouchableOpacity
            testID={primaryButtonTestID}
            disabled={isConfirmDisabled}
            onPress={() => onConfirm(value)}
          />
        </View>
      ) : null,
  };
});

describe('PerpsCustomSlippageBottomSheet', () => {
  const defaultProps = {
    isVisible: true,
    currentValueBps: 300,
    onClose: jest.fn(),
    onSave: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when not visible', () => {
    const { toJSON } = render(
      <PerpsCustomSlippageBottomSheet {...defaultProps} isVisible={false} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('saves snapped basis points when Set is pressed', () => {
    render(<PerpsCustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.SET),
    );

    expect(defaultProps.onSave).toHaveBeenCalledWith(300);
  });

  it('closes without saving when Cancel is pressed', () => {
    render(<PerpsCustomSlippageBottomSheet {...defaultProps} />);

    fireEvent.press(
      screen.getByTestId(PerpsCustomSlippageBottomSheetSelectorsIDs.CANCEL),
    );

    expect(defaultProps.onClose).toHaveBeenCalled();
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });
});
