import {
  TokenActionInput,
  useHandleOnBuy,
  useHandleOnReceive,
  useHandleOnSend,
} from './useTokenAtomicActions';

/**
 * Composed hook for the Token Details Page Actions
 */
export const useTokenActions = ({
  token,
  networkName,
}: {
  token: TokenActionInput;
  networkName?: string;
}) => {
  const onBuy = useHandleOnBuy({ token });
  const onSend = useHandleOnSend({ token });
  const onReceive = useHandleOnReceive({ token, networkName });

  return { onBuy, onSend, onReceive };
};

export default useTokenActions;
