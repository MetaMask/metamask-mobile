import { NavigationProp , ParamListBase } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';

export function handleNonEvmUrl({
  path,
  navigation,
}: {
  path: string;
  navigation: NavigationProp<ParamListBase>;
}) {
  const chainId = new URLSearchParams(path).get('chainId');

  navigation.navigate(Routes.DEEPLINK.NON_EVM, { chainId });
}
