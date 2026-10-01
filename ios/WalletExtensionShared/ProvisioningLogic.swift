import Foundation

enum ProvisioningLogic {
    static func cardsAvailable(
        cards: [SnapshotCard],
        installed: [InstalledPass]
    ) -> [SnapshotCard] {
        cards.filter { card in
            !installed.contains { pass in
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
    static func read(bundle: Bundle = .main) -> String {
        let container = bundle.bundleURL
            .deletingLastPathComponent()
            .deletingLastPathComponent()
        if let app = Bundle(url: container) {
            return FoxCodeReader.value(in: app.infoDictionary)
        }
        return FoxCodeReader.value(in: bundle.infoDictionary)
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
