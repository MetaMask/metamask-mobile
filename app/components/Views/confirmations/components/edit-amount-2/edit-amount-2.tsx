import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';
import { DepositKeyboard } from '../deposit-keyboard';
import { debounce, noop } from 'lodash';
import { TextInput } from 'react-native-gesture-handler';
import { useTokenAmount } from '../../hooks/useTokenAmount';
import { useDispatch, useSelector } from 'react-redux';
import { setPendingTokenAmount } from '../../../../../core/redux/slices/confirmationMetrics';
import { profiler } from '../edit-amount/profiler';
import { usePayContext } from '../../context/pay-context/pay-context';

export const EditAmount2 = () => {
  const dispatch = useDispatch();
  const [amountFiat, setAmountFiat] = useState<string>('0');
  //   const { amountUnformatted, updateTokenAmount } = useTokenAmount();
  const { totalHuman } = usePayContext();

  const handleChange = useCallback(
    (amount: string) => {
      setAmountFiat(amount);
      dispatch(setPendingTokenAmount(amount));
    },
    [dispatch],
  );

  const handleDone = useCallback(() => {
    profiler.log();
    profiler.reset();
  }, []);

  return (
    <View>
      <TextInput
        testID="edit-amount-input"
        style={{ fontSize: 60 }}
        value={amountFiat}
      />
      <TextInput
        testID="edit-amount-input3"
        style={{ fontSize: 60 }}
        value={totalHuman}
      />
      <DepositKeyboard
        value={amountFiat}
        hasInput
        onChange={handleChange}
        onDonePress={handleDone}
        onPercentagePress={noop}
      />
    </View>
  );
};
