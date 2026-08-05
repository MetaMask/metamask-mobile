import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { Transaction } from '@metamask/keyring-api';
import type { TransactionMeta } from '@metamask/transaction-controller';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import { ActivityDetailFooter } from './ActivityDetailsLayout';
import {
  useActivityBlockExplorer,
  type ActivityExplorerLink,
} from '../hooks/useActivityBlockExplorer';
import { ActivityDetailsSelectorsIDs } from '../ActivityDetails.testIds';

function useOpenWebview() {
  const navigation = useNavigation<AppNavigationProp>();
  return useCallback(
    ({ title, url }: { title?: string; url: string }) => {
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: { url, title },
      });
    },
    [navigation],
  );
}

/** Secondary CTA that opens an arbitrary URL in the in-app webview. */
export function ActivityDetailsWebviewButton({
  label,
  testID,
  title,
  url,
}: {
  label: string;
  testID?: string;
  title?: string;
  url: string | undefined;
}) {
  const openWebview = useOpenWebview();

  if (!url) {
    return null;
  }

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      twClassName="w-full"
      onPress={() => openWebview({ title, url })}
      testID={testID}
    >
      {label}
    </Button>
  );
}

/** Secondary CTA that opens the transaction in a block explorer webview. */
export function ActivityDetailsBlockExplorerButton({
  chainId,
  hash,
}: {
  chainId: string | undefined;
  hash: string | undefined;
}) {
  const link = useActivityBlockExplorer(chainId, hash);
  const openWebview = useOpenWebview();

  if (!link) {
    return null;
  }

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      twClassName="w-full"
      onPress={() => openWebview(link)}
      testID={ActivityDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON}
    >
      {strings('activity_details.view_on_block_explorer')}
    </Button>
  );
}

/**
 * Explorer CTA for bridge transactions.
 *
 * A cross-chain bridge lives on two networks, so it gets one button that opens
 * the block-explorer sheet to pick a leg — the same sheet the Bridge details
 * screen uses, which derives both explorers (name, network badge, URL) from the
 * transaction. Two identically-labelled buttons are indistinguishable, so they
 * are only the fallback for rows the sheet cannot serve: indexer-only rows carry
 * no local transaction for it to resolve history from. Same-chain rows get a
 * single button straight to the webview.
 */
export function ActivityDetailsBridgeExplorerButtons({
  sourceChainId,
  sourceHash,
  destChainId,
  destHash,
  evmTxMeta,
  multiChainTx,
}: {
  sourceChainId: string | undefined;
  sourceHash: string | undefined;
  destChainId: string | undefined;
  destHash: string | undefined;
  evmTxMeta?: TransactionMeta;
  multiChainTx?: Transaction;
}) {
  const navigation = useNavigation<AppNavigationProp>();
  const sourceLink = useActivityBlockExplorer(sourceChainId, sourceHash);
  const destLink = useActivityBlockExplorer(destChainId, destHash);
  const openWebview = useOpenWebview();

  const isCrossChain =
    Boolean(destLink) &&
    destChainId !== undefined &&
    destChainId !== sourceChainId;

  const openExplorerSheet = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.TRANSACTION_DETAILS_BLOCK_EXPLORER,
      params: { evmTxMeta, multiChainTx },
    });
  }, [navigation, evmTxMeta, multiChainTx]);

  if (!sourceLink && !destLink) {
    return null;
  }

  if (isCrossChain && (evmTxMeta || multiChainTx)) {
    return (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={openExplorerSheet}
        testID={ActivityDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON}
      >
        {strings('activity_details.view_on_block_explorer')}
      </Button>
    );
  }

  if (!isCrossChain) {
    const link = sourceLink ?? destLink;
    return link ? (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={() => openWebview(link)}
        testID={ActivityDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON}
      >
        {strings('activity_details.view_on_block_explorer')}
      </Button>
    ) : null;
  }

  return (
    <>
      {sourceLink ? (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          twClassName="w-full"
          onPress={() => openWebview(sourceLink)}
          testID={`${ActivityDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON}-source`}
        >
          {strings('activity_details.view_on_block_explorer')}
        </Button>
      ) : null}
      {destLink ? (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Lg}
          twClassName="w-full"
          onPress={() => openWebview(destLink)}
          testID={`${ActivityDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON}-dest`}
        >
          {strings('activity_details.view_on_block_explorer')}
        </Button>
      ) : null}
    </>
  );
}

/**
 * Primary "do it again" CTA. Both the action target and the verb are
 * transaction-type-specific (swap → "Swap again", bridge → "Bridge again",
 * etc.), so callers must supply an explicit `label` — there is intentionally
 * no generic fallback copy.
 */
export function ActivityDetailsDoItAgainButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      twClassName="w-full"
      onPress={onPress}
      testID={ActivityDetailsSelectorsIDs.DO_IT_AGAIN_BUTTON}
    >
      {label}
    </Button>
  );
}

/** Footer container that composes the call-to-action buttons. */
export function ActivityDetailsFooter({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ActivityDetailFooter testID={ActivityDetailsSelectorsIDs.FOOTER}>
      {children}
    </ActivityDetailFooter>
  );
}
