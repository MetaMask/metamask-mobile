import React, { useCallback } from 'react';
import {
  BottomSheetHeader,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { strings } from '../../../../locales/i18n';
import { NetworkList } from '../Bridge/components/BridgeTokenSelector/NetworkListModal';
import {
  selectAllowedChainRanking,
  selectTokenSelectorNetworkFilter,
  setTokenSelectorNetworkFilter,
} from '../../../core/redux/slices/bridge';
import type { RootState } from '../../../reducers';
import { QuickBuySheetSelectorsIDs } from './QuickBuySheet.testIds';
import { useQuickBuyContext } from './useQuickBuyContext';

/**
 * In-sheet network filter for the Quick Buy token picker. Writes the shared
 * token-selector network filter and returns to the picker.
 */
const QuickBuyNetworkListScreen: React.FC = () => {
  const dispatch = useDispatch();
  const { setActiveScreen } = useQuickBuyContext();
  const chainRanking = useSelector((state: RootState) =>
    selectAllowedChainRanking(state),
  );
  const selectedChainId = useSelector(selectTokenSelectorNetworkFilter);

  const handleBack = useCallback(
    () => setActiveScreen('payWith'),
    [setActiveScreen],
  );

  const handleSelect = useCallback(
    (chainId?: CaipChainId) => {
      dispatch(setTokenSelectorNetworkFilter(chainId));
      setActiveScreen('payWith');
    },
    [dispatch, setActiveScreen],
  );

  return (
    <>
      <BottomSheetHeader
        onBack={handleBack}
        backButtonProps={{
          testID: QuickBuySheetSelectorsIDs.NETWORK_LIST_BACK,
        }}
        testID={QuickBuySheetSelectorsIDs.NETWORK_LIST_HEADER}
      >
        <Text variant={TextVariant.HeadingSm}>
          {strings('bridge.select_network')}
        </Text>
      </BottomSheetHeader>
      <NetworkList
        chainRanking={chainRanking}
        selectedChainId={selectedChainId}
        onSelect={handleSelect}
      />
    </>
  );
};

export default QuickBuyNetworkListScreen;
