import type { CaipChainId, CaipNamespace, Hex } from "@metamask/utils";
import type { NetworkEnablementControllerState } from "./NetworkEnablementController.mjs";
/**
 * Base selector to get the enabled network map from the controller state.
 *
 * @param state - The NetworkEnablementController state
 * @returns The enabled network map
 */
export declare const selectEnabledNetworkMap: (state: NetworkEnablementControllerState) => {
    [x: string]: Record<string, boolean>;
};
/**
 * Selector to check if a specific network is enabled.
 *
 * This selector accepts either a Hex chain ID (for EVM networks) or a CAIP-2 chain ID
 * (for any blockchain network) and returns whether the network is currently enabled.
 * It returns false for unknown networks or if there's an error parsing the chain ID.
 *
 * @param chainId - The chain ID to check (Hex or CAIP-2 format)
 * @returns A selector function that returns true if the network is enabled, false otherwise
 */
export declare const selectIsNetworkEnabled: (chainId: Hex | CaipChainId) => ((state: NetworkEnablementControllerState) => boolean) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: {
        [x: string]: Record<string, boolean>;
    }) => boolean;
    memoizedResultFunc: ((resultFuncArgs_0: {
        [x: string]: Record<string, boolean>;
    }) => boolean) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => boolean;
    dependencies: [(state: NetworkEnablementControllerState) => {
        [x: string]: Record<string, boolean>;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/**
 * Selector to get all enabled networks for a specific namespace.
 *
 * This selector returns an array of chain IDs (as strings) for all enabled networks
 * within the specified namespace (e.g., 'eip155' for EVM networks, 'solana' for Solana).
 *
 * @param namespace - The CAIP namespace to get enabled networks for (e.g., 'eip155', 'solana')
 * @returns A selector function that returns an array of chain ID strings for enabled networks in the namespace
 */
export declare const selectEnabledNetworksForNamespace: (namespace: CaipNamespace) => ((state: NetworkEnablementControllerState) => string[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: {
        [x: string]: Record<string, boolean>;
    }) => string[];
    memoizedResultFunc: ((resultFuncArgs_0: {
        [x: string]: Record<string, boolean>;
    }) => string[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string[];
    dependencies: [(state: NetworkEnablementControllerState) => {
        [x: string]: Record<string, boolean>;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/**
 * Selector to get all enabled networks across all namespaces.
 *
 * This selector returns a record where keys are CAIP namespaces and values are arrays
 * of enabled chain IDs within each namespace.
 *
 * @returns A selector function that returns a record mapping namespace to array of enabled chain IDs
 */
export declare const selectAllEnabledNetworks: ((state: NetworkEnablementControllerState) => Record<string, string[]>) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: {
        [x: string]: Record<string, boolean>;
    }) => Record<string, string[]>;
    memoizedResultFunc: ((resultFuncArgs_0: {
        [x: string]: Record<string, boolean>;
    }) => Record<string, string[]>) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => Record<string, string[]>;
    dependencies: [(state: NetworkEnablementControllerState) => {
        [x: string]: Record<string, boolean>;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/**
 * Selector to get the total count of enabled networks across all namespaces.
 *
 * @returns A selector function that returns the total number of enabled networks
 */
export declare const selectEnabledNetworksCount: ((state: NetworkEnablementControllerState) => number) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: Record<string, string[]>) => number;
    memoizedResultFunc: ((resultFuncArgs_0: Record<string, string[]>) => number) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => number;
    dependencies: [((state: NetworkEnablementControllerState) => Record<string, string[]>) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: {
            [x: string]: Record<string, boolean>;
        }) => Record<string, string[]>;
        memoizedResultFunc: ((resultFuncArgs_0: {
            [x: string]: Record<string, boolean>;
        }) => Record<string, string[]>) & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => Record<string, string[]>;
        dependencies: [(state: NetworkEnablementControllerState) => {
            [x: string]: Record<string, boolean>;
        }];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        argsMemoize: typeof import("reselect").weakMapMemoize;
        memoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/**
 * Selector to check if any networks are enabled for a specific namespace.
 *
 * @param namespace - The CAIP namespace to check
 * @returns A selector function that returns true if any networks are enabled in the namespace
 */
export declare const selectHasEnabledNetworksForNamespace: (namespace: CaipNamespace) => ((state: NetworkEnablementControllerState) => boolean) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: string[]) => boolean;
    memoizedResultFunc: ((resultFuncArgs_0: string[]) => boolean) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => boolean;
    dependencies: [((state: NetworkEnablementControllerState) => string[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: {
            [x: string]: Record<string, boolean>;
        }) => string[];
        memoizedResultFunc: ((resultFuncArgs_0: {
            [x: string]: Record<string, boolean>;
        }) => string[]) & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => string[];
        dependencies: [(state: NetworkEnablementControllerState) => {
            [x: string]: Record<string, boolean>;
        }];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        argsMemoize: typeof import("reselect").weakMapMemoize;
        memoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/**
 * Selector to get all enabled EVM networks.
 *
 * This is a convenience selector that specifically targets EIP-155 networks.
 *
 * @returns A selector function that returns an array of enabled EVM chain IDs
 */
export declare const selectEnabledEvmNetworks: ((state: NetworkEnablementControllerState) => string[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: string[]) => string[];
    memoizedResultFunc: ((resultFuncArgs_0: string[]) => string[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string[];
    dependencies: [((state: NetworkEnablementControllerState) => string[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: {
            [x: string]: Record<string, boolean>;
        }) => string[];
        memoizedResultFunc: ((resultFuncArgs_0: {
            [x: string]: Record<string, boolean>;
        }) => string[]) & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => string[];
        dependencies: [(state: NetworkEnablementControllerState) => {
            [x: string]: Record<string, boolean>;
        }];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        argsMemoize: typeof import("reselect").weakMapMemoize;
        memoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
/**
 * Selector to get all enabled Solana networks.
 *
 * This is a convenience selector that specifically targets Solana networks.
 *
 * @returns A selector function that returns an array of enabled Solana chain IDs
 */
export declare const selectEnabledSolanaNetworks: ((state: NetworkEnablementControllerState) => string[]) & {
    clearCache: () => void;
    resultsCount: () => number;
    resetResultsCount: () => void;
} & {
    resultFunc: (resultFuncArgs_0: string[]) => string[];
    memoizedResultFunc: ((resultFuncArgs_0: string[]) => string[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    };
    lastResult: () => string[];
    dependencies: [((state: NetworkEnablementControllerState) => string[]) & {
        clearCache: () => void;
        resultsCount: () => number;
        resetResultsCount: () => void;
    } & {
        resultFunc: (resultFuncArgs_0: {
            [x: string]: Record<string, boolean>;
        }) => string[];
        memoizedResultFunc: ((resultFuncArgs_0: {
            [x: string]: Record<string, boolean>;
        }) => string[]) & {
            clearCache: () => void;
            resultsCount: () => number;
            resetResultsCount: () => void;
        };
        lastResult: () => string[];
        dependencies: [(state: NetworkEnablementControllerState) => {
            [x: string]: Record<string, boolean>;
        }];
        recomputations: () => number;
        resetRecomputations: () => void;
        dependencyRecomputations: () => number;
        resetDependencyRecomputations: () => void;
    } & {
        argsMemoize: typeof import("reselect").weakMapMemoize;
        memoize: typeof import("reselect").weakMapMemoize;
    }];
    recomputations: () => number;
    resetRecomputations: () => void;
    dependencyRecomputations: () => number;
    resetDependencyRecomputations: () => void;
} & {
    argsMemoize: typeof import("reselect").weakMapMemoize;
    memoize: typeof import("reselect").weakMapMemoize;
};
//# sourceMappingURL=selectors.d.mts.map