import React, { useCallback, useRef, useState, useContext } from 'react';
import { Modal, ScrollView, TouchableOpacity } from 'react-native';
import {
  BottomSheet,
  BottomSheetHeader,
  BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  SectionDivider,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';

import {
  useMmPayDebugData,
  MmPayDebugSection,
} from '../../../hooks/pay/debug/useMmPayDebugData';
import { useMmPayQuoteDebug } from '../../../hooks/pay/debug/useMmPayQuoteDebug';
import {
  stringifyDebug,
  truncateForDisplay,
} from '../../../utils/debug/stringify-debug-value';
import ClipboardManager from '../../../../../../core/ClipboardManager';
import { ToastContext } from '../../../../../../component-library/components/Toast';
import { ToastVariants } from '../../../../../../component-library/components/Toast/Toast.types';
import { MmPayDebugModalTestIds } from './mm-pay-debug-modal.testIds';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './mm-pay-debug-modal.styles';

export function MmPayDebugModal({ onClose }: { onClose?: () => void }) {
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const { styles } = useStyles(styleSheet, {});
  const { sections, copyAllPayload } = useMmPayDebugData();
  const quoteDebug = useMmPayQuoteDebug();
  const { toastRef } = useContext(ToastContext);

  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const handleSheetClosed = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleRequestClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  const showToast = useCallback(
    (label: string) => {
      toastRef?.current?.showToast({
        variant: ToastVariants.Plain,
        hasNoTimeout: false,
        labelOptions: [{ label }],
      });
    },
    [toastRef],
  );

  const handleCopy = useCallback(
    async (text: string, isAll?: boolean) => {
      try {
        await ClipboardManager.setString(text);
      } catch {
        showToast('Copy failed (clipboard unavailable)');
        return;
      }
      let message = 'Copied to clipboard';
      if (isAll && text.length > 100000) {
        message = `Copied! (Size: ~${Math.round(text.length / 1024)}KB)`;
      }
      showToast(message);
    },
    [showToast],
  );

  const handleCopyAll = useCallback(() => {
    handleCopy(stringifyDebug(copyAllPayload), true);
  }, [copyAllPayload, handleCopy]);

  const handleCopyQuote = useCallback(() => {
    handleCopy(stringifyDebug(quoteDebug.rawQuote));
  }, [quoteDebug.rawQuote, handleCopy]);

  return (
    <Modal
      visible
      animationType="none"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={handleRequestClose}
    >
      <BottomSheet
        testID={MmPayDebugModalTestIds.MODAL}
        ref={bottomSheetRef}
        keyboardAvoidingViewEnabled={false}
        onClose={handleSheetClosed}
      >
        <BottomSheetHeader
          onClose={handleRequestClose}
          closeButtonProps={{ testID: 'close-button' }}
        >
          MMPay Debug
        </BottomSheetHeader>
        <ScrollView contentContainerStyle={styles.scrollView}>
          {quoteDebug.isRelay && (
            <>
              <Box
                testID={MmPayDebugModalTestIds.QUOTE_SECTION}
                style={styles.quoteSection}
                marginBottom={0}
              >
                <Box style={styles.quoteHeader}>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Bold}
                  >
                    Quote
                  </Text>
                  <Button
                    size={ButtonSize.Sm}
                    variant="secondary"
                    testID={MmPayDebugModalTestIds.QUOTE_COPY_BUTTON}
                    onPress={handleCopyQuote}
                  >
                    Copy quote
                  </Button>
                </Box>
                {quoteDebug.rows.map((row) => (
                  <Box key={row.label} style={styles.quoteRow}>
                    <Text variant={TextVariant.BodySm}>{row.label}</Text>
                    {row.infoValue !== undefined ? (
                      <Box style={styles.quoteValueGroup}>
                        <Text variant={TextVariant.BodySm}>{row.value}</Text>
                        <Tag severity={TagSeverity.Info}>{row.infoValue}</Tag>
                      </Box>
                    ) : row.boolValue !== undefined ? (
                      <Tag
                        severity={
                          row.boolValue
                            ? TagSeverity.Success
                            : TagSeverity.Danger
                        }
                      >
                        {row.value}
                      </Tag>
                    ) : row.value === 'undefined' ? (
                      <Tag severity={TagSeverity.Neutral}>{row.value}</Tag>
                    ) : (
                      <Text variant={TextVariant.BodySm}>{row.value}</Text>
                    )}
                  </Box>
                ))}
              </Box>
            </>
          )}
          {sections.map((section: MmPayDebugSection) => {
            const isExpanded = expandedSection === section.key;
            return (
              <Box key={section.key} style={styles.sectionContainer}>
                <Box style={styles.sectionHeader}>
                  <TouchableOpacity
                    style={styles.sectionTitleContainer}
                    testID={MmPayDebugModalTestIds.sectionHeader(section.key)}
                    onPress={() =>
                      setExpandedSection(isExpanded ? null : section.key)
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Bold}
                    >
                      {section.title}
                    </Text>
                  </TouchableOpacity>
                  <Button
                    size={ButtonSize.Sm}
                    variant="secondary"
                    testID={MmPayDebugModalTestIds.sectionCopy(section.key)}
                    onPress={() => handleCopy(stringifyDebug(section.value))}
                  >
                    Copy
                  </Button>
                </Box>
                {isExpanded && (
                  <Box style={styles.sectionContent}>
                    {section.key === 'transactionMetrics' && (
                      <Text
                        variant={TextVariant.BodyXs}
                        style={styles.sectionNote}
                      >
                        Note: May not include all the metrics
                      </Text>
                    )}
                    {section.value === undefined || section.value === null ? (
                      <Text style={styles.emptyStateText}>
                        No {section.title} available
                      </Text>
                    ) : (
                      <Text style={styles.monospaceText}>
                        {truncateForDisplay(stringifyDebug(section.value))}
                      </Text>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
          <Box style={styles.copyAllButtonContainer}>
            <Button
              testID={MmPayDebugModalTestIds.COPY_ALL_BUTTON}
              onPress={handleCopyAll}
            >
              Copy All Debug Data
            </Button>
          </Box>
        </ScrollView>
      </BottomSheet>
    </Modal>
  );
}
