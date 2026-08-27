import React from 'react';
import { ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { ImmersveLegalDocumentLink } from '../../util/immersveLegalDocuments';

interface ImmersveLegalClickwrapProps {
  documents: ImmersveLegalDocumentLink[];
  isLoading: boolean;
  error: Error | null;
  onRetry: () => void;
  /**
   * When true, an empty document list after a successful load is treated as
   * an error (retry) instead of rendering nothing and soft-locking SignUp.
   */
  treatEmptyAsError?: boolean;
}

function openDocument(url: string) {
  Linking.openURL(url).catch(() => {
    // Swallow — user can retry via the link.
  });
}

function getSeparator(index: number, total: number): string {
  if (index === 0) {
    return '';
  }
  const isLast = index === total - 1;
  if (!isLast) {
    return ', ';
  }
  // "A and B" vs "A, B, and C"
  return total > 2
    ? `,${strings('card.card_onboarding.sign_up.clickwrap_and')}`
    : strings('card.card_onboarding.sign_up.clickwrap_and');
}

function LegalDocsError({ onRetry }: { onRetry: () => void }) {
  return (
    <Box
      twClassName="items-center gap-1 py-2"
      testID="signup-immersve-legal-error"
    >
      <Text
        variant={TextVariant.BodySm}
        twClassName="text-error-default text-center"
      >
        {strings('card.card_onboarding.sign_up.legal_docs_error')}
      </Text>
      <TouchableOpacity onPress={onRetry} testID="signup-immersve-legal-retry">
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-primary-default text-center"
        >
          {strings('card.card_onboarding.retry_button')}
        </Text>
      </TouchableOpacity>
    </Box>
  );
}

/**
 * Clickwrap copy with tappable legal-document titles.
 * Continuing the primary CTA constitutes agreement (no checkboxes).
 */
const ImmersveLegalClickwrap = ({
  documents,
  isLoading,
  error,
  onRetry,
  treatEmptyAsError = false,
}: ImmersveLegalClickwrapProps) => {
  if (isLoading) {
    return (
      <Box
        twClassName="items-center py-2"
        testID="signup-immersve-legal-loading"
      >
        <ActivityIndicator />
      </Box>
    );
  }

  if (error || (treatEmptyAsError && documents.length === 0)) {
    return <LegalDocsError onRetry={onRetry} />;
  }

  if (documents.length === 0) {
    return null;
  }

  return (
    <Text
      variant={TextVariant.BodySm}
      twClassName="text-text-alternative text-center"
      testID="signup-immersve-legal-clickwrap"
    >
      {strings('card.card_onboarding.sign_up.clickwrap_prefix')}
      {documents.map((legalDocument, index) => (
        <React.Fragment key={legalDocument.id}>
          {getSeparator(index, documents.length)}
          <Text
            variant={TextVariant.BodySm}
            twClassName="text-text-alternative underline"
            onPress={() => openDocument(legalDocument.url)}
            testID={`signup-immersve-legal-link-${legalDocument.id}`}
          >
            {legalDocument.title}
          </Text>
        </React.Fragment>
      ))}
      {strings('card.card_onboarding.sign_up.clickwrap_suffix')}
    </Text>
  );
};

export default ImmersveLegalClickwrap;
