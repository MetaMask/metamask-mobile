import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  RpcEndpointType,
  type NetworkConfiguration,
} from '@metamask/network-controller';
import type { Hex } from '@metamask/utils';

type NetworkRpcEndpoint = NetworkConfiguration['rpcEndpoints'][number];
import { selectEvmNetworkConfigurationsByChainId } from '../../../../../selectors/networkController';
import Networks from '../../../../../util/networks';
import { allNetworks } from '../NetworkDetailsView.constants';
import { getDefaultBlockExplorerUrl } from '../NetworkDetailsView.utils';
import type {
  NetworkDetailsViewParams,
  NetworkFormState,
  RpcEndpoint,
} from '../NetworkDetailsView.types';
import { useFormFocus, type UseFormFocusReturn } from './useFormFocus';
import { useFormModals, type UseFormModalsReturn } from './useFormModals';

/**
 * Converts network-controller RpcEndpoint[] to the form's RpcEndpoint[].
 * The form uses a simplified shape with name always being a string.
 */
function toFormRpcEndpoints(
  endpoints: NetworkRpcEndpoint[] | undefined,
): RpcEndpoint[] {
  if (!endpoints) return [];
  return endpoints.map((ep) => ({
    url: ep.url,
    failoverUrls: 'failoverUrls' in ep ? ep.failoverUrls : undefined,
    name:
      ep.type === RpcEndpointType.Infura
        ? 'Infura'
        : 'name' in ep
          ? (ep.name ?? '')
          : '',
    type: ep.type,
  }));
}

/**
 * Extracts the display name for an RPC endpoint.
 */
function getRpcEndpointName(
  endpoint: NetworkRpcEndpoint | undefined,
): string | undefined {
  if (!endpoint) return undefined;
  if (endpoint.type === RpcEndpointType.Infura) return 'Infura';
  return 'name' in endpoint ? endpoint.name : undefined;
}

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------
export interface UseNetworkFormReturn
  extends UseFormFocusReturn,
    UseFormModalsReturn {
  form: NetworkFormState;
  enableAction: boolean;

  // Form field handlers
  onNicknameChange: (value: string) => void;
  onChainIDChange: (value: string) => void;
  onTickerChange: (value: string) => void;
  autoFillNameField: (name: string) => void;
  autoFillSymbolField: (ticker: string) => void;

  // RPC handlers
  onRpcUrlAdd: (url: string) => void;
  onRpcNameAdd: (name: string) => void;
  onRpcItemAdd: (url: string, name: string) => void;
  onRpcUrlChangeWithName: (
    url: string,
    failoverUrls: string[] | undefined,
    name: string,
    type: string,
  ) => void;
  onRpcUrlDelete: (url: string) => void;

  // Block explorer handlers
  onBlockExplorerItemAdd: (url: string) => void;
  onBlockExplorerUrlChange: (url: string) => void;
  onBlockExplorerUrlDelete: (url: string) => void;

  // Register a callback invoked after form changes that require re-validation
  setValidationCallback: (cb: (() => void) | null) => void;
}

// ---------------------------------------------------------------------------
// Hook implementation
// ---------------------------------------------------------------------------
export const useNetworkForm = (
  params: NetworkDetailsViewParams | undefined,
): UseNetworkFormReturn => {
  const networkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );

  // ---- Form state ----------------------------------------------------------
  const [form, setForm] = useState<NetworkFormState>({
    rpcUrl: undefined,
    failoverRpcUrls: undefined,
    rpcName: undefined,
    rpcUrlForm: '',
    rpcNameForm: '',
    rpcUrls: [],
    blockExplorerUrls: [],
    selectedRpcEndpointIndex: 0,
    blockExplorerUrl: undefined,
    blockExplorerUrlForm: undefined,
    nickname: undefined,
    chainId: undefined,
    ticker: undefined,
    editable: undefined,
    addMode: false,
  });

  // ---- Composed hooks ------------------------------------------------------
  const focusState = useFormFocus();
  const modalState = useFormModals(
    form.rpcUrls.length,
    form.blockExplorerUrls.length,
    setForm,
  );

  // ---- Derived / tracking state -------------------------------------------
  const [enableAction, setEnableAction] = useState(false);
  const [initialStateStr, setInitialStateStr] = useState<string | undefined>(
    undefined,
  );

  // Allows the parent to register a callback we invoke after
  // certain form changes (e.g. chainId change, rpc change).
  const requestValidation = useRef<(() => void) | null>(null);

  const setValidationCallback = useCallback((cb: (() => void) | null) => {
    requestValidation.current = cb;
  }, []);

  // ---- Helpers -------------------------------------------------------------
  const getCurrentState = useCallback(() => {
    setForm((prev) => {
      const actual =
        (prev.rpcUrl ?? '') +
        (prev.blockExplorerUrl ?? '') +
        (prev.nickname ?? '') +
        (prev.chainId ?? '') +
        (prev.ticker ?? '') +
        (prev.editable ?? '') +
        String(prev.rpcUrls);

      setEnableAction(actual !== initialStateStr);
      return prev; // no mutation
    });
  }, [initialStateStr]);

  // ---- Initialization (componentDidMount equivalent) -----------------------
  useEffect(() => {
    const networkTypeOrRpcUrl = params?.network;

    if (networkTypeOrRpcUrl) {
      // --- Edit mode: populate from existing network config ----------------
      let networkConfiguration: NetworkConfiguration | undefined;
      let editable: boolean;
      let networkType: string | undefined;

      if (allNetworks.find((net: string) => networkTypeOrRpcUrl === net)) {
        const networkInformation =
          Networks[networkTypeOrRpcUrl as keyof typeof Networks];
        const networkChainId = (
          networkInformation as { chainId: string }
        ).chainId?.toString();
        networkConfiguration = networkChainId
          ? networkConfigurations?.[networkChainId as Hex]
          : undefined;
        editable = false;
        networkType = networkTypeOrRpcUrl;
      } else {
        networkConfiguration = Object.values(networkConfigurations).find(
          (cfg) => {
            const endpoint = cfg.rpcEndpoints?.[cfg.defaultRpcEndpointIndex];
            if (!endpoint) return false;
            return (
              endpoint.url === networkTypeOrRpcUrl ||
              ('networkClientId' in endpoint &&
                endpoint.networkClientId === networkTypeOrRpcUrl)
            );
          },
        );
        editable = true;
      }

      const chainId = networkConfiguration?.chainId;
      const defaultRpcEndpoint: NetworkRpcEndpoint | undefined =
        networkConfiguration
          ? networkConfiguration.rpcEndpoints?.[
              networkConfiguration.defaultRpcEndpointIndex
            ]
          : undefined;

      const defaultRpcEndpointClientId =
        defaultRpcEndpoint && 'networkClientId' in defaultRpcEndpoint
          ? defaultRpcEndpoint.networkClientId
          : undefined;

      const fallbackExplorerUrl = chainId
        ? getDefaultBlockExplorerUrl(
            chainId,
            networkType ?? defaultRpcEndpointClientId ?? '',
          )
        : undefined;

      const configBlockExplorerUrls = networkConfiguration?.blockExplorerUrls;
      const blockExplorerUrls =
        configBlockExplorerUrls && configBlockExplorerUrls.length > 0
          ? configBlockExplorerUrls
          : fallbackExplorerUrl
            ? [fallbackExplorerUrl]
            : [];

      const blockExplorerUrl =
        networkConfiguration?.blockExplorerUrls?.[
          networkConfiguration?.defaultBlockExplorerUrlIndex ?? 0
        ] ?? fallbackExplorerUrl;

      const rpcUrl = defaultRpcEndpoint?.url;
      const failoverRpcUrls =
        defaultRpcEndpoint && 'failoverUrls' in defaultRpcEndpoint
          ? defaultRpcEndpoint.failoverUrls
          : undefined;
      const rpcName = getRpcEndpointName(defaultRpcEndpoint);
      const rpcUrls = toFormRpcEndpoints(networkConfiguration?.rpcEndpoints);
      const nickname = networkConfiguration?.name;
      const ticker = networkConfiguration?.nativeCurrency;
      const selectedRpcEndpointIndex =
        networkConfiguration?.defaultRpcEndpointIndex ?? 0;

      const stateSnapshot =
        (rpcUrl ?? '') +
        String(failoverRpcUrls) +
        (blockExplorerUrl ?? '') +
        (nickname ?? '') +
        (chainId ?? '') +
        (ticker ?? '') +
        String(editable) +
        String(rpcUrls) +
        String(blockExplorerUrls);

      setInitialStateStr(stateSnapshot);
      setForm({
        rpcUrl,
        failoverRpcUrls,
        rpcName,
        rpcUrlForm: '',
        rpcNameForm: '',
        rpcUrls,
        blockExplorerUrls,
        selectedRpcEndpointIndex,
        blockExplorerUrl,
        blockExplorerUrlForm: undefined,
        nickname,
        chainId,
        ticker,
        editable,
        addMode: false,
      });
    } else {
      // --- Add mode --------------------------------------------------------
      const prefill = params?.prefill;
      const newForm: NetworkFormState = {
        rpcUrl: prefill?.rpcUrl,
        failoverRpcUrls: undefined,
        rpcName: undefined,
        rpcUrlForm: prefill?.rpcUrl ?? '',
        rpcNameForm: '',
        rpcUrls: [],
        blockExplorerUrls: [],
        selectedRpcEndpointIndex: 0,
        blockExplorerUrl: prefill?.blockExplorerUrl,
        blockExplorerUrlForm: prefill?.blockExplorerUrl,
        nickname: prefill?.nickname,
        chainId: prefill?.chainId,
        ticker: prefill?.ticker,
        editable: undefined,
        addMode: true,
      };

      if (prefill?.rpcUrl) {
        const rpcEndpoint: RpcEndpoint = {
          url: prefill.rpcUrl,
          name: '',
          type: RpcEndpointType.Custom,
        };
        newForm.rpcUrls = [rpcEndpoint];
        newForm.rpcUrl = rpcEndpoint.url;
      }
      if (prefill?.blockExplorerUrl) {
        newForm.blockExplorerUrls = [prefill.blockExplorerUrl];
      }

      setForm(newForm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After initial form set, compute enableAction + trigger validation for prefill
  useEffect(() => {
    if (form.addMode && form.chainId) {
      getCurrentState();
      requestValidation.current?.();
    }
    // Only run once form is initialized with addMode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.addMode]);

  // ---- Form field handlers ------------------------------------------------
  const onNicknameChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, nickname: value }));
      getCurrentState();
    },
    [getCurrentState],
  );

  const onChainIDChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, chainId: value }));
      getCurrentState();
    },
    [getCurrentState],
  );

  const onTickerChange = useCallback(
    (value: string) => {
      setForm((prev) => ({ ...prev, ticker: value }));
      getCurrentState();
    },
    [getCurrentState],
  );

  const autoFillNameField = useCallback(
    (name: string) => {
      setForm((prev) => ({ ...prev, nickname: name }));
      getCurrentState();
    },
    [getCurrentState],
  );

  const autoFillSymbolField = useCallback(
    (ticker: string) => {
      setForm((prev) => ({ ...prev, ticker }));
      getCurrentState();
    },
    [getCurrentState],
  );

  // ---- RPC handlers -------------------------------------------------------
  const onRpcUrlAdd = useCallback(
    (url: string) => {
      setForm((prev) => {
        if (prev.addMode) {
          const endpoint: RpcEndpoint = {
            url,
            name: prev.rpcNameForm,
            type: RpcEndpointType.Custom,
          };
          return {
            ...prev,
            rpcUrlForm: url,
            rpcUrl: url,
            rpcUrls: [endpoint],
          };
        }
        return { ...prev, rpcUrlForm: url };
      });
      getCurrentState();
    },
    [getCurrentState],
  );

  const onRpcNameAdd = useCallback(
    (name: string) => {
      setForm((prev) => {
        if (prev.addMode) {
          const endpoint: RpcEndpoint = {
            url: prev.rpcUrlForm,
            name,
            type: RpcEndpointType.Custom,
          };
          return {
            ...prev,
            rpcNameForm: name,
            rpcName: name,
            rpcUrls: [endpoint],
          };
        }
        return { ...prev, rpcNameForm: name };
      });
      getCurrentState();
    },
    [getCurrentState],
  );

  const onRpcItemAdd = useCallback(
    (url: string, name: string) => {
      if (!url) return;
      const newRpcUrl: RpcEndpoint = {
        url,
        name: name ?? '',
        type: RpcEndpointType.Custom,
      };
      setForm((prev) => ({
        ...prev,
        rpcUrls: [...prev.rpcUrls, newRpcUrl],
        rpcUrl: newRpcUrl.url,
        failoverRpcUrls: undefined,
        rpcName: newRpcUrl.name,
        rpcUrlForm: '',
        rpcNameForm: '',
      }));
      getCurrentState();
    },
    [getCurrentState],
  );

  const onRpcUrlChangeWithName = useCallback(
    (
      url: string,
      failoverUrls: string[] | undefined,
      name: string,
      type: string,
    ) => {
      const nameToUse = name || type;
      setForm((prev) => ({
        ...prev,
        rpcName: nameToUse,
        rpcUrl: url,
        failoverRpcUrls: failoverUrls,
      }));
      getCurrentState();
      requestValidation.current?.();
    },
    [getCurrentState],
  );

  const onRpcUrlDelete = useCallback(
    (url: string) => {
      setForm((prev) => {
        const updated = prev.rpcUrls.filter((rpc) => rpc.url !== url);
        const isCurrentRpc = prev.rpcUrl === url;
        return {
          ...prev,
          rpcUrls: updated,
          ...(isCurrentRpc && updated.length > 0
            ? {
                rpcUrl: updated[0].url,
                failoverRpcUrls: updated[0].failoverUrls,
                rpcName: updated[0].name,
              }
            : {}),
        };
      });
      getCurrentState();
      requestValidation.current?.();
    },
    [getCurrentState],
  );

  // ---- Block explorer handlers --------------------------------------------
  const onBlockExplorerItemAdd = useCallback(
    (url: string) => {
      if (!url) return;
      setForm((prev) => {
        if (prev.blockExplorerUrls.includes(url)) return prev;
        return {
          ...prev,
          blockExplorerUrls: [...prev.blockExplorerUrls, url],
          blockExplorerUrl: url,
          blockExplorerUrlForm: undefined,
        };
      });
      getCurrentState();
    },
    [getCurrentState],
  );

  const onBlockExplorerUrlChange = useCallback(
    (url: string) => {
      setForm((prev) => {
        if (prev.addMode) {
          return {
            ...prev,
            blockExplorerUrlForm: url,
            blockExplorerUrl: url,
            blockExplorerUrls: url ? [url] : [],
          };
        }
        return {
          ...prev,
          blockExplorerUrlForm: url,
          blockExplorerUrl: url,
        };
      });
      getCurrentState();
      requestValidation.current?.();
    },
    [getCurrentState],
  );

  const onBlockExplorerUrlDelete = useCallback(
    (url: string) => {
      setForm((prev) => ({
        ...prev,
        blockExplorerUrls: prev.blockExplorerUrls.filter((u) => u !== url),
      }));
      getCurrentState();
      requestValidation.current?.();
    },
    [getCurrentState],
  );

  return {
    form,
    enableAction,
    ...focusState,
    ...modalState,
    onNicknameChange,
    onChainIDChange,
    onTickerChange,
    autoFillNameField,
    autoFillSymbolField,
    onRpcUrlAdd,
    onRpcNameAdd,
    onRpcItemAdd,
    onRpcUrlChangeWithName,
    onRpcUrlDelete,
    onBlockExplorerItemAdd,
    onBlockExplorerUrlChange,
    onBlockExplorerUrlDelete,
    setValidationCallback,
  };
};
