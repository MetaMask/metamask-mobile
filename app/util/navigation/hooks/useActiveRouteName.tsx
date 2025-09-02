import { useRoute } from '@react-navigation/native';

/**
 * Returns the active route name from navigation
 */
export default function useCurrentRouteName() {
  const { name: routeName } = useRoute();
  let mappedRouteName = routeName;

  // Preserve existing compatibility mapping
  if (
    routeName === 'Main' ||
    routeName === 'WalletTabHome' ||
    routeName === 'Home'
  )
    mappedRouteName = 'WalletView';
  if (routeName === 'TransactionsHome') mappedRouteName = 'TransactionsView';
  return mappedRouteName;
}
