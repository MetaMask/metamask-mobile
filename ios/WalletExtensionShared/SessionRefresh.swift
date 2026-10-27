import Foundation
import os

private let sessionLog = Logger(subsystem: "io.metamask.MetaMask", category: "WalletExtension")

enum SessionRefreshOutcome: Equatable {
    case ready(CardTokenSet)
    /// Refresh token is past expiry, or the provider rejected it with 400 or 401.
    case expired
    /// Keychain, lock, or network problem. The snapshot stays in place.
    case unavailable
}

enum SessionRefresh {
    static func usableTokens(
        snapshot: ProvisioningSnapshot,
        store: CardTokenStoring = KeychainCardTokenStore(),
        http: ProviderHTTP = ProviderHTTP(),
        password: String? = ContainingAppFoxCode.read(),
        lockDirectory: URL? = AppGroupLocator.containerURL(),
        deadline: Date = Date().addingTimeInterval(18)
    ) async -> SessionRefreshOutcome {
        guard let password else {
            sessionLog.error("Card session unreadable")
            return .unavailable
        }
        guard var tokens = try? store.load(providerId: snapshot.providerId, password: password) else {
            sessionLog.error("Card session unreadable")
            return .unavailable
        }
        guard ProvisioningLogic.sessionMatches(snapshot: snapshot, tokens: tokens) else {
            return .unavailable
        }
        guard ProvisioningLogic.shouldRefreshAccessToken(tokens) else { return .ready(tokens) }
        guard let directory = lockDirectory else { return .unavailable }
        let lock = AppGroupRefreshLock(directory: directory)
        let lockWait = min(4, deadline.timeIntervalSinceNow)
        guard lockWait > 0, lock.acquire(timeout: lockWait) else {
            sessionLog.error("Refresh lock timed out")
            return .unavailable
        }
        defer { lock.release() }
        if let latest = try? store.load(providerId: snapshot.providerId, password: password),
           ProvisioningLogic.sessionMatches(snapshot: snapshot, tokens: latest),
           !ProvisioningLogic.shouldRefreshAccessToken(latest) {
            return .ready(latest)
        }
        guard let current = try? store.load(providerId: snapshot.providerId, password: password),
              ProvisioningLogic.sessionMatches(snapshot: snapshot, tokens: current) else {
            return .unavailable
        }
        tokens = current
        if refreshTokenUnusable(tokens) {
            return .expired
        }
        guard let base = URL(string: snapshot.apiBaseUrl), ProviderHosts.isAllowed(base) else { return .unavailable }
        guard deadline.timeIntervalSinceNow >= http.timeout else { return .unavailable }
        do {
            let refreshed = try await refresh(snapshot: snapshot, tokens: tokens, base: base, http: http)
            try store.save(providerId: snapshot.providerId, tokens: refreshed, password: password)
            return .ready(refreshed)
        } catch {
            if let latest = try? store.load(providerId: snapshot.providerId, password: password),
               !ProvisioningLogic.shouldRefreshAccessToken(latest) {
                return .ready(latest)
            }
            if isDefinitiveRejection(error) {
                return .expired
            }
            sessionLog.error("Session refresh failed")
            return .unavailable
        }
    }

    private static func refreshTokenUnusable(_ tokens: CardTokenSet, now: Date = Date()) -> Bool {
        if tokens.refreshToken == nil {
            return true
        }
        guard let expiry = tokens.refreshTokenExpiresAt else {
            return false
        }
        return expiry <= now.timeIntervalSince1970 * 1000
    }

    private static func isDefinitiveRejection(_ error: Error) -> Bool {
        guard case let ProviderClientError.http(status, _) = error else {
            return false
        }
        return status == 400 || status == 401
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
