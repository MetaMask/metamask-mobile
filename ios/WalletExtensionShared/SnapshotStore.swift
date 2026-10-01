import Foundation

enum SnapshotStore {
    static let appGroupId = "group.io.metamask.MetaMask"

    static func write(_ snapshot: ProvisioningSnapshot, defaults: UserDefaults) throws {
        let data = try JSONEncoder().encode(snapshot)
        defaults.set(data, forKey: ProvisioningSnapshot.storageKey)
    }

    static func read(defaults: UserDefaults) -> ProvisioningSnapshot? {
        guard let data = defaults.data(forKey: ProvisioningSnapshot.storageKey) else {
            return nil
        }
        return try? JSONDecoder().decode(ProvisioningSnapshot.self, from: data)
    }

    static func clear(defaults: UserDefaults) {
        defaults.removeObject(forKey: ProvisioningSnapshot.storageKey)
    }
}
