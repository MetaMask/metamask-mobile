import { useEffect, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useDepositSDK } from '../../sdk';

// TODO: This component will route to either:
//   - build quote
//   - pending orders
const Root = () => {
  const navigation = useNavigation();

  // TODO: for now it is hardcoded to build quote because order state is not implemented yet
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [initialRoute, setInitialRoute] = useState<string>(
    Routes.DEPOSIT.BUILD_QUOTE,
  );
  const { checkExistingToken } = useDepositSDK();
  const hasCheckedToken = useRef(false);

  useEffect(() => {
    const initializeFlow = async () => {
      if (hasCheckedToken.current) return;
      await checkExistingToken();
      hasCheckedToken.current = true;
    };
    initializeFlow();
  }, [checkExistingToken]);

  useEffect(() => {
    if (initialRoute === null) return;
    navigation.reset({
      index: 0,
      routes: [{ name: initialRoute, params: { animationEnabled: false } }],
    });
  });

  return null;
};

export default Root;
