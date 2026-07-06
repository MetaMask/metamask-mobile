import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
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

function useOpenExplorer() {
  const navigation = useNavigation();
  return useCallback(
    (link: ActivityExplorerLink) => {
      navigation.navigate(Routes.WEBVIEW.MAIN, {
        screen: Routes.WEBVIEW.SIMPLE,
        params: { url: link.url, title: link.title },
      });
    },
    [navigation],
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
  const openExplorer = useOpenExplorer();

  if (!link) {
    return null;
  }

  return (
    <Button
      variant={ButtonVariant.Secondary}
      size={ButtonSize.Lg}
      twClassName="w-full"
      onPress={() => openExplorer(link)}
      testID={ActivityDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON}
    >
      {strings('activity_details.view_on_block_explorer')}
    </Button>
  );
}

/**
 * Multi-explorer CTA for cross-chain (bridge) transactions: renders a separate
 * "view on explorer" button per leg when source and destination differ.
 * Falls back to a single button otherwise. Provided for per-type templates.
 */
export function ActivityDetailsBridgeExplorerButtons({
  sourceChainId,
  sourceHash,
  destChainId,
  destHash,
}: {
  sourceChainId: string | undefined;
  sourceHash: string | undefined;
  destChainId: string | undefined;
  destHash: string | undefined;
}) {
  const sourceLink = useActivityBlockExplorer(sourceChainId, sourceHash);
  const destLink = useActivityBlockExplorer(destChainId, destHash);
  const openExplorer = useOpenExplorer();

  const isCrossChain =
    Boolean(destLink) &&
    destChainId !== undefined &&
    destChainId !== sourceChainId;

  if (!sourceLink && !destLink) {
    return null;
  }

  if (!isCrossChain) {
    const link = sourceLink ?? destLink;
    return link ? (
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={() => openExplorer(link)}
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
          onPress={() => openExplorer(sourceLink)}
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
          onPress={() => openExplorer(destLink)}
          testID={`${ActivityDetailsSelectorsIDs.BLOCK_EXPLORER_BUTTON}-dest`}
        >
          {strings('activity_details.view_on_block_explorer')}
        </Button>
      ) : null}
    </>
  );
}

/**
 * Primary "do it again" CTA. The action target is type-specific (swap → swap,
 * send → send), so per-type templates supply `onPress`; the generic fallback
 * omits it.
 */
export function ActivityDetailsDoItAgainButton({
  label,
  onPress,
}: {
  label?: string;
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
      {label ?? strings('activity_details.do_it_again')}
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
