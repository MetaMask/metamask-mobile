import React, { useEffect, useRef } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetFooter,
  Box,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { CollectiblesPack } from '../../types';
import { CollectiblesPackDetailTestIds as IDs } from '../../Collectibles.testIds';
import PackOdds from '../../components/PackOdds';
import CollectiblesSheetModal from '../../components/CollectiblesSheetModal/CollectiblesSheetModal';

export type PackInformation = 'odds' | 'insured';

/** Read-only information, separate from the purchase authorization sheet. */
const CollectiblesPackInformation = ({
  kind,
  pack,
  onClose,
}: {
  kind: PackInformation;
  pack: CollectiblesPack;
  onClose: () => void;
}) => {
  const tw = useTailwind();
  const sheet = useRef<BottomSheetRef>(null);
  useEffect(() => {
    sheet.current?.onOpenBottomSheet();
  }, []);
  const close = () => sheet.current?.onCloseBottomSheet();

  return (
    <CollectiblesSheetModal onRequestClose={close}>
      <BottomSheet ref={sheet} onClose={onClose} testID={IDs.INFORMATION}>
        <BottomSheetHeader onClose={close}>
          {strings(
            kind === 'odds'
              ? 'collectibles.pack_detail.pack_odds'
              : 'collectibles.card.insured_value',
          )}
        </BottomSheetHeader>
        <ScrollView
          style={tw.style('grow-0 shrink min-h-0')}
          showsVerticalScrollIndicator={false}
          bounces
        >
          <Box paddingHorizontal={5} paddingBottom={4}>
            {kind === 'odds' ? (
              <PackOdds pack={pack} />
            ) : (
              <Text variant={TextVariant.BodySm}>
                {strings('collectibles.pack_detail.insured_description')}
              </Text>
            )}
          </Box>
        </ScrollView>
        <BottomSheetFooter
          twClassName="px-5 pb-4"
          primaryButtonProps={{
            children: strings('collectibles.pack_detail.got_it'),
            onPress: close,
          }}
        />
      </BottomSheet>
    </CollectiblesSheetModal>
  );
};

export default CollectiblesPackInformation;
