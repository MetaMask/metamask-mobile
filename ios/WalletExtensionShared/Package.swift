// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "WalletExtensionShared",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "WalletExtensionShared", targets: ["WalletExtensionShared"]),
        .executable(name: "lock-holder", targets: ["lock-holder"]),
    ],
    targets: [
        .target(
            name: "WalletExtensionShared",
            path: ".",
            exclude: ["Tests", "lock-holder", "Package.swift"],
            sources: [
                "BaanxLogin.swift",
                "CardTokenKeychain.swift",
                "Encryptor.swift",
                "EncryptorPayload.swift",
                "ProviderClients.swift",
                "ProviderHosts.swift",
                "ProvisioningLogic.swift",
                "RefreshLock.swift",
                "SessionRefresh.swift",
                "SnapshotStore.swift",
                "WalletModels.swift",
            ]
        ),
        .executableTarget(
            name: "lock-holder",
            dependencies: ["WalletExtensionShared"],
            path: "lock-holder"
        ),
        .testTarget(
            name: "WalletExtensionSharedTests",
            dependencies: ["WalletExtensionShared"],
            path: "Tests",
            exclude: ["Fixtures"]
        ),
    ]
)
