import Foundation

enum SnapshotStore {
    static let appGroupId = "group.io.metamask.MetaMask"
    static let fileName = "CardWalletProvisioning.v1.json"

    static func write(_ snapshot: ProvisioningSnapshot, directory: URL) throws {
        let url = fileURL(in: directory)
        let data = try JSONEncoder().encode(snapshot)
        try data.write(to: url, options: [.atomic, .completeFileProtection])
        var stored = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try stored.setResourceValues(values)
    }

    static func read(directory: URL, defaults: UserDefaults? = nil) -> ProvisioningSnapshot? {
        if let snapshot = decode(try? Data(contentsOf: fileURL(in: directory))) {
            return snapshot
        }
        guard
            let defaults,
            let legacy = defaults.data(forKey: ProvisioningSnapshot.storageKey),
            let snapshot = decode(legacy)
        else {
            return nil
        }
        try? write(snapshot, directory: directory)
        defaults.removeObject(forKey: ProvisioningSnapshot.storageKey)
        return snapshot
    }

    static func clear(directory: URL, defaults: UserDefaults? = nil) {
        try? FileManager.default.removeItem(at: fileURL(in: directory))
        defaults?.removeObject(forKey: ProvisioningSnapshot.storageKey)
    }

    private static func fileURL(in directory: URL) -> URL {
        directory.appendingPathComponent(fileName)
    }

    private static func decode(_ data: Data?) -> ProvisioningSnapshot? {
        guard let data, let snapshot = try? JSONDecoder().decode(ProvisioningSnapshot.self, from: data) else {
            return nil
        }
        return snapshot.validated()
    }
}
