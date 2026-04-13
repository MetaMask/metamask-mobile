import React, { useCallback, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { StatCell, PendingTag } from './CampaignStatsSummary';
import { formatTierDisplayName } from './OndoLeaderboard.utils';
import { formatUsd } from '../../utils/formatUtils';
import { ONDO_GM_REQUIRED_QUALIFIED_DAYS } from '../../utils/ondoCampaignConstants';
import { strings } from '../../../../../../locales/i18n';

export const ONDO_PENDING_SHEET_TEST_IDS = {
  CONTAINER: 'ondo-pending-sheet-container',
  TIER_CELL: 'ondo-pending-sheet-tier-cell',
  NET_DEPOSIT_CELL: 'ondo-pending-sheet-net-deposit-cell',
  BODY: 'ondo-pending-sheet-body',
  CTA: 'ondo-pending-sheet-cta',
} as const;

type OndoPendingSheetParams =
  | {
      variant: 'own';
      tier: string;
      netDeposit: number;
      qualifiedDays: number;
      tierMinDeposit: number;
    }
  | { variant: 'other' };

interface OndoPendingSheetProps {
  route: {
    params: OndoPendingSheetParams;
  };
}

const OndoPendingSheet: React.FC<OndoPendingSheetProps> = ({ route }) => {
  const navigation = useNavigation();
  const sheetRef = useRef<BottomSheetRef>(null);
  const { params } = route;

  const handleClose = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleGotIt = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={ONDO_PENDING_SHEET_TEST_IDS.CONTAINER}
    >
      <BottomSheetHeader onClose={handleClose}>
        <Text variant={TextVariant.HeadingMd} twClassName="text-center">
          {strings('rewards.ondo_campaign_leaderboard.pending_sheet_title')}
        </Text>
      </BottomSheetHeader>

      <Box twClassName="px-4 pb-4 pt-6 gap-6">
        {params.variant === 'own' ? (
          <>
            <Box flexDirection={BoxFlexDirection.Row}>
              <StatCell
                label={strings(
                  'rewards.ondo_campaign_leaderboard.pending_sheet_tier_label',
                )}
                value={formatTierDisplayName(params.tier)}
                suffix={<PendingTag />}
                testID={ONDO_PENDING_SHEET_TEST_IDS.TIER_CELL}
              />
              <StatCell
                label={strings(
                  'rewards.ondo_campaign_leaderboard.pending_sheet_net_deposit_label',
                )}
                value={formatUsd(params.netDeposit)}
                testID={ONDO_PENDING_SHEET_TEST_IDS.NET_DEPOSIT_CELL}
              />
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={ONDO_PENDING_SHEET_TEST_IDS.BODY}
            >
              {strings(
                'rewards.ondo_campaign_leaderboard.pending_sheet_own_body',
                {
                  minDeposit: formatUsd(params.tierMinDeposit),
                  daysRemaining: Math.max(
                    ONDO_GM_REQUIRED_QUALIFIED_DAYS - params.qualifiedDays,
                    1,
                  ),
                },
              )}
            </Text>
          </>
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            testID={ONDO_PENDING_SHEET_TEST_IDS.BODY}
          >
            {strings(
              'rewards.ondo_campaign_leaderboard.pending_sheet_other_body',
            )}
          </Text>
        )}

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          onPress={handleGotIt}
          twClassName="w-full"
          testID={ONDO_PENDING_SHEET_TEST_IDS.CTA}
        >
          {strings('rewards.ondo_campaign_leaderboard.pending_sheet_cta')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default OndoPendingSheet;
