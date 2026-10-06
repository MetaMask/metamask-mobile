import Foundation

@objc(CardWalletExtensionStore)
class CardWalletExtensionStore: NSObject {
    private static var refreshLock: AppGroupRefreshLock?

    @objc static func requiresMainQueueSetup() -> Bool {
        false
    }

    @objc func constantsToExport() -> [AnyHashable: Any] {
        [
            "cardKeychainAccessGroup": CardTokenKeychainLayout.cardAccessGroup(),
            "defaultKeychainAccessGroup": CardTokenKeychainLayout.defaultAccessGroup(),
        ]
    }

    @objc func writeSnapshot(
        _ json: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let data = json.data(using: .utf8) else {
            rejecter("invalid_snapshot", "Snapshot was not valid text", nil)
            return
        }
        do {
            let decoded = try JSONDecoder().decode(ProvisioningSnapshot.self, from: data)
            guard let snapshot = decoded.validated() else {
                rejecter("invalid_snapshot", "Snapshot could not be stored", nil)
                return
            }
            guard let directory = AppGroupLocator.containerURL() else {
                rejecter("app_group", "App Group defaults are unavailable", nil)
                return
            }
            try SnapshotStore.write(snapshot, directory: directory)
            resolver(nil)
        } catch {
            rejecter("invalid_snapshot", "Snapshot could not be stored", error)
        }
    }

    @objc func clearSnapshot(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let directory = AppGroupLocator.containerURL() else {
            resolver(nil)
            return
        }
        SnapshotStore.clear(
            directory: directory,
            defaults: UserDefaults(suiteName: AppGroupLocator.identifier)
        )
        resolver(nil)
    }

    @objc func acquireRefreshLock(
        _ timeoutMs: NSNumber,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let directory = AppGroupLocator.containerURL() else {
            resolver(false)
            return
        }
        let lock = AppGroupRefreshLock(directory: directory)
        let acquired = lock.acquire(timeout: timeoutMs.doubleValue / 1000)
        if acquired {
            Self.refreshLock = lock
        }
        resolver(acquired)
    }

    @objc func releaseRefreshLock(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        Self.refreshLock?.release()
        Self.refreshLock = nil
        resolver(nil)
    }
}
