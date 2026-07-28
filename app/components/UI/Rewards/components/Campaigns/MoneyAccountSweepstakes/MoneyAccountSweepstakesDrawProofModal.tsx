import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  BottomSheet,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type {
  MoneyAccountSweepstakesDrawProofDto,
  MoneyAccountSweepstakesLocalizedTextDto,
} from '../../../../../../core/Engine/controllers/rewards-controller/types';
import ClipboardManager from '../../../../../../core/ClipboardManager';
import { strings } from '../../../../../../../locales/i18n';
import useRewardsToast from '../../../hooks/useRewardsToast';
import { StatCell } from '../OndoCampaignStatsSummary';

export const MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS = {
  CONTAINER: 'money-account-sweepstakes-draw-proof-modal',
  TITLE: 'money-account-sweepstakes-draw-proof-modal-title',
  CLOSE: 'money-account-sweepstakes-draw-proof-modal-close',
  GOT_IT: 'money-account-sweepstakes-draw-proof-modal-got-it',
  ENTRIES: 'money-account-sweepstakes-draw-proof-modal-entries',
  WINNERS: 'money-account-sweepstakes-draw-proof-modal-winners',
  RESERVES: 'money-account-sweepstakes-draw-proof-modal-reserves',
  MERKLE_ROOT: 'money-account-sweepstakes-draw-proof-modal-merkle-root',
  MERKLE_ROOT_COPY:
    'money-account-sweepstakes-draw-proof-modal-merkle-root-copy',
  SEED_BLOCK: 'money-account-sweepstakes-draw-proof-modal-seed-block',
  SEED_HASH: 'money-account-sweepstakes-draw-proof-modal-seed-hash',
  SEED_HASH_COPY: 'money-account-sweepstakes-draw-proof-modal-seed-hash-copy',
  FORMULA: 'money-account-sweepstakes-draw-proof-modal-formula',
  FORMULA_TOGGLE: 'money-account-sweepstakes-draw-proof-modal-formula-toggle',
  FORMULA_DESCRIPTION:
    'money-account-sweepstakes-draw-proof-modal-formula-description',
  ORIGINAL_DRAW: 'money-account-sweepstakes-draw-proof-modal-original-draw',
} as const;

interface MoneyAccountSweepstakesDrawProofModalProps {
  drawProof: MoneyAccountSweepstakesDrawProofDto;
  localizedText: MoneyAccountSweepstakesLocalizedTextDto;
  onClose: () => void;
}

/** Truncate a long hex/hash for display, e.g. `0x8b2a…db11`. */
export function truncateHash(
  value: string,
  prefixLength = 6,
  suffixLength = 4,
): string {
  if (value.length <= prefixLength + suffixLength + 1) {
    return value;
  }
  return `${value.slice(0, prefixLength)}…${value.slice(-suffixLength)}`;
}

interface CopyableValueRowProps {
  label: string;
  fullValue: string;
  displayValue: string;
  valueTestID: string;
  copyTestID: string;
  onCopy: (value: string) => void;
}

const CopyableValueRow: React.FC<CopyableValueRowProps> = ({
  label,
  fullValue,
  displayValue,
  valueTestID,
  copyTestID,
  onCopy,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    twClassName="gap-2"
  >
    <Box twClassName="flex-1 gap-0.5">
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
      >
        {label}
      </Text>
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        testID={valueTestID}
      >
        {displayValue}
      </Text>
    </Box>
    <ButtonIcon
      iconName={IconName.Copy}
      size={ButtonIconSize.Md}
      iconProps={{ color: IconColor.IconDefault }}
      onPress={() => onCopy(fullValue)}
      testID={copyTestID}
    />
  </Box>
);

/**
 * Inline draw-proof bottom sheet for Money Account Sweepstakes.
 * Mount outside ScrollView (sibling of page content), same as CampaignOptInSheet —
 * design-system BottomSheet overlays with absolute inset relative to its parent.
 */
const MoneyAccountSweepstakesDrawProofModal: React.FC<
  MoneyAccountSweepstakesDrawProofModalProps
> = ({ drawProof, localizedText, onClose }) => {
  const { explanation, originalDraw } = drawProof;
  const { showToast, RewardsToastOptions } = useRewardsToast();
  const [isFormulaExpanded, setIsFormulaExpanded] = useState(false);

  const handleCopy = useCallback(
    async (value: string) => {
      try {
        await ClipboardManager.setString(value);
        showToast(
          RewardsToastOptions.success(
            strings('notifications.copied_to_clipboard'),
          ),
        );
      } catch {
        // Clipboard write failures are non-critical.
      }
    },
    [RewardsToastOptions, showToast],
  );

  return (
    <BottomSheet
      onClose={onClose}
      testID={MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.CONTAINER}
    >
      <Box twClassName="px-4 pb-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="mb-6"
        >
          <Box twClassName="w-10" />
          <Box
            twClassName="flex-1 items-center"
            justifyContent={BoxJustifyContent.Center}
          >
            <Text
              variant={TextVariant.HeadingSm}
              fontWeight={FontWeight.Bold}
              testID={MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.TITLE}
            >
              {localizedText.drawProofTitle}
            </Text>
          </Box>
          <ButtonIcon
            iconName={IconName.Close}
            iconProps={{ color: IconColor.IconDefault }}
            onPress={onClose}
            testID={MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.CLOSE}
          />
        </Box>

        <ScrollView
          showsVerticalScrollIndicator={false}
          testID={
            MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.ORIGINAL_DRAW
          }
        >
          <Box twClassName="gap-4 mb-6">
            <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
              <StatCell
                label={localizedText.drawProofEntriesLabel}
                value={String(explanation.entryCount)}
                testID={
                  MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.ENTRIES
                }
              />
              <StatCell
                label={localizedText.winnersLabel}
                value={String(explanation.winnerCount)}
                testID={
                  MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.WINNERS
                }
              />
              <StatCell
                label={localizedText.reservesLabel}
                value={String(explanation.reserveCount)}
                testID={
                  MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.RESERVES
                }
              />
            </Box>

            <CopyableValueRow
              label={localizedText.merkleRootLabel}
              fullValue={explanation.merkleRoot}
              displayValue={truncateHash(explanation.merkleRoot)}
              valueTestID={
                MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.MERKLE_ROOT
              }
              copyTestID={
                MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.MERKLE_ROOT_COPY
              }
              onCopy={handleCopy}
            />

            <Box twClassName="gap-0.5">
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {localizedText.seedBlockLabel}
              </Text>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                testID={
                  MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.SEED_BLOCK
                }
              >
                {String(explanation.seedBlock)}
              </Text>
            </Box>

            <CopyableValueRow
              label={localizedText.seedBlockHashLabel}
              fullValue={explanation.seedBlockHash}
              displayValue={truncateHash(explanation.seedBlockHash)}
              valueTestID={
                MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.SEED_HASH
              }
              copyTestID={
                MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.SEED_HASH_COPY
              }
              onCopy={handleCopy}
            />

            <Box twClassName="gap-1">
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {localizedText.formulaLabel}
              </Text>
              <Pressable
                onPress={() => setIsFormulaExpanded((prev) => !prev)}
                testID={
                  MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.FORMULA_TOGGLE
                }
                accessibilityRole="button"
                accessibilityState={{ expanded: isFormulaExpanded }}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-1"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    twClassName="flex-1"
                    testID={
                      MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.FORMULA
                    }
                  >
                    {localizedText.drawFormulaLabel}
                  </Text>
                  <Icon
                    name={
                      isFormulaExpanded ? IconName.ArrowUp : IconName.ArrowDown
                    }
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </Pressable>
              {isFormulaExpanded && (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  testID={
                    MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.FORMULA_DESCRIPTION
                  }
                >
                  {localizedText.drawFormulaDescription}
                </Text>
              )}
            </Box>

            <Box twClassName="gap-3">
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {localizedText.originalDrawTitle}
              </Text>
              {originalDraw.map((entry) => {
                const header = `#${entry.drawOrder} · ${entry.addressPrefix}${
                  entry.isReserve ? ` ${localizedText.reserveSuffix}` : ''
                }`;
                return (
                  <Box key={entry.drawOrder}>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {header}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </ScrollView>

        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          onPress={onClose}
          twClassName="w-full"
          testID={MONEY_ACCOUNT_SWEEPSTAKES_DRAW_PROOF_MODAL_TEST_IDS.GOT_IT}
        >
          {strings('rewards.upcoming_rewards.cta_label')}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default MoneyAccountSweepstakesDrawProofModal;
