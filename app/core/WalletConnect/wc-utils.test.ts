import {
	parseWalletConnectUri,
	hideWCLoadingState,
	showWCLoadingState,
	isValidWCURI,
	waitForNetworkModalOnboarding,
	getApprovedSessionMethods,
	getScopedPermissions,
	checkWCPermissions,
  networkModalOnboardingConfig,
} from "./wc-utils";
import type { NavigationContainerRef } from "@react-navigation/native";
import Routes from "../../../app/constants/navigation/Routes";
import * as StoreModule from "../../../app/store";
import { selectProviderConfig } from "../../selectors/networkController";
import {
	findExistingNetwork,
	switchToNetwork,
} from "../RPCMethods/lib/ethereum-chain-utils";
import DevLogger from "../SDKConnect/utils/DevLogger";
import qs from "qs";
import { parseRelayParams } from "@walletconnect/utils";

// Mock dependencies
jest.mock("../Engine", () => ({
	context: {
		ApprovalController: {
			clear: jest.fn(),
			add: jest.fn().mockResolvedValue({}),
		},
	},
}));

jest.mock("../../../app/store", () => {
	const mockStore = {
		getState: jest.fn(),
	};
	return {
		store: mockStore,
	};
});

jest.mock("../Permissions", () => ({
	getPermittedAccounts: jest.fn().mockResolvedValue(["0x123"]),
	getPermittedChains: jest.fn().mockResolvedValue(["eip155:1"]),
}));

jest.mock("../../selectors/networkController", () => ({
	selectNetworkConfigurations: jest.fn().mockReturnValue({}),
	selectProviderConfig: jest.fn().mockReturnValue({ chainId: "0x1" }) as jest.Mock,
}));

jest.mock("../RPCMethods/lib/ethereum-chain-utils", () => ({
	findExistingNetwork: jest.fn(),
	switchToNetwork: jest.fn().mockResolvedValue(true),
}));

jest.mock("../SDKConnect/utils/DevLogger", () => ({
	log: jest.fn(),
}));

jest.mock("qs", () => ({
	parse: jest.fn((queryString: string) => {
		if (!queryString) return {};
		const params: { [key: string]: string } = {};
		const pairs = queryString.slice(1).split("&");
		pairs.forEach((pair) => {
			const [key, value] = pair.split("=");
			params[key] = value;
		});
		return params;
	}),
}));

jest.mock("@walletconnect/utils", () => ({
	parseRelayParams: jest.fn((params) => {
		return params.relayProtocol
			? { protocol: params.relayProtocol }
			: undefined;
	}),
}));

describe("WalletConnect Utils", () => {
	let mockNavigation: jest.Mocked<NavigationContainerRef>;
	const mockStore = (StoreModule as any).store;

	beforeEach(() => {
		mockNavigation = {
			getCurrentRoute: jest.fn(),
			navigate: jest.fn(),
			goBack: jest.fn(),
			canGoBack: jest.fn().mockReturnValue(true),
		} as unknown as jest.Mocked<NavigationContainerRef>;

		mockStore.getState.mockReturnValue({
			networkOnboarded: {
				networkOnboardedState: {},
			},
		});

		jest.clearAllMocks();
	});

	describe("parseWalletConnectUri", () => {
		it("parses v1 URI correctly", () => {
			const uri = "wc:topic@1?bridge=https://bridge&key=abc&handshakeTopic=xyz";
			const result = parseWalletConnectUri(uri);
			expect(result).toEqual({
				protocol: "wc",
				topic: "topic",
				version: 1,
				bridge: "https://bridge",
				key: "abc",
				handshakeTopic: "xyz",
				symKey: undefined,
				relay: undefined,
			});
		});

		it("parses v2 URI correctly", () => {
			const uri = "wc:topic@2?symKey=def&relayProtocol=irn";
			const result = parseWalletConnectUri(uri);
			expect(result).toEqual({
				protocol: "wc",
				topic: "topic",
				version: 2,
				symKey: "def",
				relay: { protocol: "irn" },
				bridge: undefined,
				key: undefined,
				handshakeTopic: undefined,
			});
		});
	});

	describe("hideWCLoadingState", () => {
		it("navigates back from SDK_LOADING sheet", () => {
			mockNavigation.getCurrentRoute.mockReturnValue({
				name: Routes.SHEET.SDK_LOADING,
				key: "123",
			});
			hideWCLoadingState({ navigation: mockNavigation });
			expect(mockNavigation.goBack).toHaveBeenCalled();
		});

		it("navigates back from RETURN_TO_DAPP_MODAL", () => {
			mockNavigation.getCurrentRoute.mockReturnValue({
				name: Routes.SHEET.RETURN_TO_DAPP_MODAL,
				key: "123",
			});
			hideWCLoadingState({ navigation: mockNavigation });
			expect(mockNavigation.goBack).toHaveBeenCalled();
		});
	});

	describe("showWCLoadingState", () => {
		it("navigates to SDK_LOADING sheet", () => {
			showWCLoadingState({ navigation: mockNavigation });
			expect(mockNavigation.navigate).toHaveBeenCalledWith(
				Routes.MODAL.ROOT_MODAL_FLOW,
				{ screen: Routes.SHEET.SDK_LOADING },
			);
		});
	});

	describe("isValidWCURI", () => {
		it("validates v1 URI correctly", () => {
			const uri = "wc:topic@1?bridge=https://bridge&key=abc&handshakeTopic=xyz";
			expect(isValidWCURI(uri)).toBe(true);
		});

		it("validates v2 URI correctly", () => {
			const uri = "wc:topic@2?symKey=def&relayProtocol=irn";
			expect(isValidWCURI(uri)).toBe(true);
		});

		it("returns false for invalid URI", () => {
			const uri = "wc:topic@1";
			expect(isValidWCURI(uri)).toBe(false);
		});
	});

	describe("waitForNetworkModalOnboarding", () => {
		it("waits until network is onboarded", async () => {
			mockStore.getState.mockReturnValueOnce({
				networkOnboarded: {
					networkOnboardedState: { "1": true },
				},
			});
			await expect(
				waitForNetworkModalOnboarding({ chainId: "1" }),
			).resolves.toBeUndefined();
		});

		it("throws timeout error after max iterations", async () => {
			networkModalOnboardingConfig.MAX_LOOP_COUNTER = 1;
			mockStore.getState.mockReturnValue({
				networkOnboarded: {
					networkOnboardedState: { "1": false },
				},
			});
			await expect(
				waitForNetworkModalOnboarding({ chainId: "1" }),
			).rejects.toThrow("Timeout error");
		});
	});

	describe("getApprovedSessionMethods", () => {
		it("returns all approved EIP-155 methods", () => {
			const methods = getApprovedSessionMethods({ origin: "test" });
			expect(methods).toContain("eth_sendTransaction");
			expect(methods).toContain("wallet_switchEthereumChain");
		});
	});

	describe("getScopedPermissions", () => {
		it("returns correct scoped permissions", async () => {
			const result = await getScopedPermissions({ origin: "test" });
			expect(result).toEqual({
				eip155: {
					chains: ["eip155:1"],
					methods: expect.any(Array),
					events: ["chainChanged", "accountsChanged"],
					accounts: ["eip155:1:0x123"],
				},
			});
		});
	});

	describe("checkWCPermissions", () => {
		beforeEach(() => {
			(findExistingNetwork as jest.Mock).mockReturnValue({ chainId: "0x1" });
		});

		it("returns true for permitted chain", async () => {
			const result = await checkWCPermissions({
				origin: "test",
				caip2ChainId: "eip155:1",
			});
			expect(result).toBe(true);
		});

		it("throws error for non-existent network", async () => {
			(findExistingNetwork as jest.Mock).mockReturnValue(null);
			await expect(
				checkWCPermissions({
					origin: "test",
					caip2ChainId: "eip155:2",
				}),
			).rejects.toThrow("Invalid parameters");
		});

		it("switches network when chainIds differ", async () => {
			(selectProviderConfig as unknown as jest.Mock).mockReturnValue({ chainId: "0x2" });
			await checkWCPermissions({
				origin: "test",
				caip2ChainId: "eip155:1",
			});
			expect(switchToNetwork).toHaveBeenCalled();
		});
	});
});
