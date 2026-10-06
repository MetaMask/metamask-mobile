import Foundation

enum ProviderHosts {
    static let flagsHost = "client-config.api.cx.metamask.io"

    private static let hosts: Set<String> = [
        "api.baanx.com",
        "dev.api.baanx.com",
        "foxdev2-ag.foxcard.io",
        "api.immersve.com",
        "test.immersve.com",
    ]

    static func isAllowed(_ url: URL) -> Bool {
        guard url.scheme == "https", let host = url.host?.lowercased() else {
            return false
        }
        return hosts.contains(host)
    }
}

extension ProvisioningSnapshot {
    func validated() -> ProvisioningSnapshot? {
        guard
            let api = URL(string: apiBaseUrl),
            ProviderHosts.isAllowed(api),
            let flags = URL(string: flagsEndpoint.url),
            flags.scheme == "https",
            flags.host?.lowercased() == ProviderHosts.flagsHost
        else {
            return nil
        }
        return self
    }
}
