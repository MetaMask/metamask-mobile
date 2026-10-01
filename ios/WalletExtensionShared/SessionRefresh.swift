import Foundation
import os

private let sessionLog = Logger(subsystem: "io.metamask.MetaMask", category: "WalletExtension")

enum SessionRefresh {
    static func usableTokens(
        snapshot: ProvisioningSnapshot,
        store: CardTokenStoring = KeychainCardTokenStore(),
        http: ProviderHTTP = ProviderHTTP(),
        password: String = ContainingAppFoxCode.read(),
        lockDirectory: URL? = AppGroupLocator.containerURL()
    ) async -> CardTokenSet? {
        guard var tokens = try? store.load(providerId: snapshot.providerId, password: password) else {
            sessionLog.error("Card session unreadable")
            return nil
        }
        guard ProvisioningLogic.sessionMatches(snapshot: snapshot, tokens: tokens) else {
            return nil
        }
        guard ProvisioningLogic.shouldRefreshAccessToken(tokens) else { return tokens }
        guard let directory = lockDirectory else { return nil }
        let lock = AppGroupRefreshLock(directory: directory)
        guard lock.acquire(timeout: 10) else {
            sessionLog.error("Refresh lock timed out")
            return nil
        }
        defer { lock.release() }
        if let latest = try? store.load(providerId: snapshot.providerId, password: password),
           ProvisioningLogic.sessionMatches(snapshot: snapshot, tokens: latest),
           !ProvisioningLogic.shouldRefreshAccessToken(latest) {
            return latest
        }
        guard let current = try? store.load(providerId: snapshot.providerId, password: password) else {
            return nil
        }
        tokens = current
        guard let base = URL(string: snapshot.apiBaseUrl) else { return nil }
        do {
            let refreshed = try await refresh(snapshot: snapshot, tokens: tokens, base: base, http: http)
            try store.save(providerId: snapshot.providerId, tokens: refreshed, password: password)
            return refreshed
        } catch {
            if let latest = try? store.load(providerId: snapshot.providerId, password: password),
               !ProvisioningLogic.shouldRefreshAccessToken(latest) {
                return latest
            }
            sessionLog.error("Session refresh failed")
            return nil
        }
    }

    private static func refresh(
        snapshot: ProvisioningSnapshot,
        tokens: CardTokenSet,
        base: URL,
        http: ProviderHTTP
    ) async throws -> CardTokenSet {
        if snapshot.providerId == "baanx" {
            guard let clientKey = snapshot.baanxClientKey else { throw ProviderClientError.invalidResponse }
            return try await BaanxClient.refresh(tokens: tokens, baseURL: base, clientKey: clientKey, http: http)
        }
        guard
            let clientApplicationId = snapshot.immersveClientApplicationId,
            let appUrl = snapshot.immersveAppUrl
        else {
            throw ProviderClientError.invalidResponse
        }
        return try await ImmersveClient.refresh(
            tokens: tokens,
            baseURL: base,
            clientApplicationId: clientApplicationId,
            appUrl: appUrl,
            http: http
        )
    }
}
