import Foundation

enum ProvisioningLogic {
    static func cardsAvailable(
        cards: [SnapshotCard],
        installed: [InstalledPass]
    ) -> [SnapshotCard] {
        cards.filter { card in
            !installed.contains { pass in
                guard pass.activationState != .deactivated else {
                    return false
                }
                if
                    let identifier = card.primaryAccountIdentifier,
                    !identifier.isEmpty,
                    pass.primaryAccountIdentifier == identifier
                {
                    return true
                }
                return pass.primaryAccountNumberSuffix == card.lastFour
            }
        }
    }

    static func shouldRefreshAccessToken(_ tokens: CardTokenSet, now: Date = Date()) -> Bool {
        tokens.accessTokenIsStale(now: now)
    }

    static func sessionMatches(snapshot: ProvisioningSnapshot, tokens: CardTokenSet) -> Bool {
        guard let expected = snapshot.providerUserId, !expected.isEmpty else {
            return true
        }
        return tokens.sessionIdentity == expected
    }

    /// Local check for `status()`, which has to return within 100 ms and cannot
    /// refresh tokens. A missing refresh expiry is not treated as expired.
    static func sessionLooksUsable(
        snapshot: ProvisioningSnapshot,
        tokens: CardTokenSet?,
        now: Date = Date()
    ) -> Bool {
        guard let tokens, sessionMatches(snapshot: snapshot, tokens: tokens) else {
            return false
        }
        guard let expiry = tokens.refreshTokenExpiresAt else {
            return true
        }
        return expiry > now.timeIntervalSince1970 * 1000
    }

    static func excludingRemotePasses<T>(_ passes: [T], isRemote: (T) -> Bool) -> [T] {
        passes.filter { !isRemote($0) }
    }

    /// The pass PassKit installs does not carry Immersve's series id. When every
    /// installed pass with this suffix shares one identifier, send that instead.
    static func provisioningIdentifier(
        for card: SnapshotCard,
        installed: [InstalledPass]
    ) -> String? {
        let identifiers = Set(
            installed
                .filter { $0.primaryAccountNumberSuffix == card.lastFour }
                .compactMap(\.primaryAccountIdentifier)
                .filter { !$0.isEmpty }
        )
        if identifiers.count == 1, let resolved = identifiers.first {
            return resolved
        }
        guard let identifier = card.primaryAccountIdentifier, !identifier.isEmpty else {
            return nil
        }
        return identifier
    }

    static func card(matching identifier: String, in cards: [SnapshotCard]) -> SnapshotCard? {
        cards.first { $0.entryId == identifier }
    }

    static func flagEnabled(
        payload: Any?,
        fallback: Bool,
        appVersion: String
    ) -> Bool {
        guard let payload else { return fallback }
        if let value = payload as? Bool { return value }
        guard let object = payload as? [String: Any] else { return fallback }
        let enabled = object["enabled"] as? Bool ?? false
        guard enabled else { return false }
        guard let minimum = object["minimumVersion"] as? String, !minimum.isEmpty else {
            return true
        }
        return compareVersions(appVersion, minimum) != .orderedAscending
    }

    static func compareVersions(_ lhs: String, _ rhs: String) -> ComparisonResult {
        let left = lhs.split(separator: ".").map { Int($0) ?? 0 }
        let right = rhs.split(separator: ".").map { Int($0) ?? 0 }
        let count = max(left.count, right.count)
        for index in 0..<count {
            let l = index < left.count ? left[index] : 0
            let r = index < right.count ? right[index] : 0
            if l < r { return .orderedAscending }
            if l > r { return .orderedDescending }
        }
        return .orderedSame
    }
}

enum AppGroupLocator {
    static let identifier = "group.io.metamask.MetaMask"

    static func containerURL() -> URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: identifier)
    }
}

enum ContainingAppFoxCode {
    static let containingAppIdentifier = "io.metamask.MetaMask"

    static func read(bundle: Bundle = .main) -> String? {
        let container = bundle.bundleURL
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        guard
            let app = Bundle(url: container),
            app.bundleIdentifier == containingAppIdentifier
        else {
            return nil
        }
        return FoxCodeReader.value(in: app.infoDictionary)
    }
}

enum FoxCodeReader {
    /// Matches AppDelegate: a missing key falls back to "debug"; an empty string does not.
    static func value(in info: [String: Any]?) -> String {
        guard let info, info.keys.contains("fox_code") else {
            return "debug"
        }
        return info["fox_code"] as? String ?? ""
    }
}
