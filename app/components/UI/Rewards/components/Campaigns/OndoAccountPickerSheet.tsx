import React, { useMemo } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { useSelector } from 'react-redux';
import {
  BadgeWrapper,
  BadgeWrapperPosition,
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AccountGroupObject } from '@metamask/account-tree-controller';
import { Hex } from '@metamask/utils';

import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { NetworkBadgeSource } from '../../../AssetOverview/Balance/Balance';
import TrendingTokenLogo from '../../../Trending/components/TrendingTokenLogo';
import { selectResolvedSelectedAccountGroup } from '../../../../../selectors/multichainAccounts/accountTreeController';
import {
  AccountGroupSelectRow,
  getChainHex,
  type AccountPickerConfig,
} from './OndoPortfolio';
import { strings } from '../../../../../../locales/i18n';

interface OndoAccountPickerSheetProps {
  pendingPicker: AccountPickerConfig;
  sheetRef: React.RefObject<BottomSheetRef>;
  onClose: () => void;
  onGroupSelect: (group: AccountGroupObject) => void;
}

const OndoAccountPickerSheet: React.FC<OndoAccountPickerSheetProps> = ({
  pendingPicker,
  sheetRef,
  onClose,
  onGroupSelect,
}) => {
  const selectedGroup = useSelector(selectResolvedSelectedAccountGroup);
  const { height: screenHeight } = useWindowDimensions();
  const listStyle = useMemo(
    () => ({ maxHeight: screenHeight * 0.4 }),
    [screenHeight],
  );

  return (
    <BottomSheet onClose={onClose} ref={sheetRef}>
      <BottomSheetHeader
        onClose={() => sheetRef.current?.onCloseBottomSheet(onClose)}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
            {`${strings('rewards.ondo_campaign_portfolio.switch_account_sheet_prefix')} `}
          </Text>
          <BadgeWrapper
            position={BadgeWrapperPosition.BottomRight}
            badge={
              getChainHex(pendingPicker.row.tokenAsset) ? (
                <Badge
                  variant={BadgeVariant.Network}
                  size={AvatarSize.Xs}
                  isScaled={false}
                  imageSource={NetworkBadgeSource(
                    getChainHex(pendingPicker.row.tokenAsset) as Hex,
                  )}
                />
              ) : null
            }
          >
            <TrendingTokenLogo
              assetId={pendingPicker.row.tokenAsset}
              symbol={pendingPicker.row.tokenSymbol}
              size={28}
            />
          </BadgeWrapper>
          <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
            {` ${pendingPicker.row.tokenSymbol}`}
          </Text>
        </Box>
      </BottomSheetHeader>
      <Box twClassName="px-4 pb-3">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings(
            'rewards.ondo_campaign_portfolio.switch_account_sheet_description',
          )}
        </Text>
      </Box>
      <ScrollView style={listStyle}>
        {pendingPicker.entries.map(({ group, balance }) => (
          <AccountGroupSelectRow
            key={group.id}
            group={group}
            balance={balance}
            tokenSymbol={pendingPicker.row.tokenSymbol}
            isSelected={group.id === selectedGroup?.id}
            onPress={() => onGroupSelect(group)}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

export default OndoAccountPickerSheet;
