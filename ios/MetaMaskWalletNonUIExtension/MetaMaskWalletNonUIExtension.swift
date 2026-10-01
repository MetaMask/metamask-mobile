import Foundation
import os
import PassKit
import WatchConnectivity

private let log = Logger(subsystem: "io.metamask.MetaMask", category: "WalletExtension")

class MetaMaskWalletNonUIExtension: PKIssuerProvisioningExtensionHandler {
    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
        let status = PKIssuerProvisioningExtensionStatus()
        let snapshot = SnapshotStore.read(defaults: appGroupDefaults())
        let installed = InstalledPasses.load()
        let phone = snapshot.map {
            ProvisioningLogic.cardsAvailable(cards: $0.cards, installed: installed.phone)
        } ?? []
        let watch = snapshot.map {
            ProvisioningLogic.cardsAvailable(cards: $0.cards, installed: installed.watch)
        } ?? []
        status.passEntriesAvailable = !phone.isEmpty
        let watchPaired = WCSession.isSupported() && WCSession.default.isPaired
        status.remotePassEntriesAvailable = watchPaired && !watch.isEmpty
        status.requiresAuthentication = true
        completion(status)
    }

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        Task {
            let entries = await WalletExtensionPasses.entries(remote: false)
            completion(entries)
        }
    }

    override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        Task {
            let entries = await WalletExtensionPasses.entries(remote: true)
            completion(entries)
        }
    }

    override func generateAddPaymentPassRequestForPassEntryWithIdentifier(
        _ identifier: String,
        configuration: PKAddPaymentPassRequestConfiguration,
        certificateChain certificates: [Data],
        nonce: Data,
        nonceSignature: Data,
        completionHandler completion: @escaping (PKAddPaymentPassRequest?) -> Void
    ) {
        Task {
            let request = await WalletExtensionPasses.provision(
                identifier: identifier,
                certificates: certificates,
                nonce: nonce,
                nonceSignature: nonceSignature
            )
            completion(request)
        }
    }
}

private func appGroupDefaults() -> UserDefaults {
    UserDefaults(suiteName: AppGroupLocator.identifier) ?? .standard
}

enum InstalledPasses {
    static func load() -> (phone: [InstalledPass], watch: [InstalledPass]) {
        let library = PKPassLibrary()
        let phone = library.passes(of: .secureElement).compactMap { pass in
            (pass as? PKSecureElementPass).map(installed)
        }
        let watch = library.remoteSecureElementPasses.map(installed)
        return (phone, watch)
    }

    private static func installed(_ pass: PKSecureElementPass) -> InstalledPass {
        InstalledPass(
            primaryAccountIdentifier: pass.primaryAccountIdentifier,
            primaryAccountNumberSuffix: pass.primaryAccountNumberSuffix
        )
    }
}

enum WalletExtensionPasses {
    static func entries(remote: Bool) async -> [PKIssuerProvisioningExtensionPassEntry] {
        guard var snapshot = SnapshotStore.read(defaults: appGroupDefaults()) else { return [] }
        guard await FlagsClient.isEnabled(snapshot: snapshot) else { return [] }
        if let tokens = await SessionRefresh.usableTokens(snapshot: snapshot),
           let base = URL(string: snapshot.apiBaseUrl) {
            let live = try? await liveCards(snapshot: snapshot, tokens: tokens, base: base)
            if let live, !live.isEmpty {
                snapshot.cards = live
                try? SnapshotStore.write(snapshot, defaults: appGroupDefaults())
            }
        }
        let installed = InstalledPasses.load()
        let cards = ProvisioningLogic.cardsAvailable(
            cards: snapshot.cards,
            installed: remote ? installed.watch : installed.phone
        )
        guard let art = makeCardArt() else { return [] }
        return cards.compactMap { card in
            guard let configuration = configuration(for: card) else { return nil }
            return PKIssuerProvisioningExtensionPaymentPassEntry(
                identifier: card.entryId,
                title: card.title,
                art: art,
                addRequestConfiguration: configuration
            )
        }
    }

    static func provision(
        identifier: String,
        certificates: [Data],
        nonce: Data,
        nonceSignature: Data
    ) async -> PKAddPaymentPassRequest? {
        guard let snapshot = SnapshotStore.read(defaults: appGroupDefaults()) else { return nil }
        guard await FlagsClient.isEnabled(snapshot: snapshot) else { return nil }
        guard let card = snapshot.cards.first(where: { $0.entryId == identifier }) else { return nil }
        guard let tokens = await SessionRefresh.usableTokens(snapshot: snapshot) else { return nil }
        guard let base = URL(string: snapshot.apiBaseUrl) else { return nil }
        let http = ProviderHTTP()
        do {
            let payload: ProvisioningPayload
            if snapshot.providerId == "baanx" {
                guard let clientKey = snapshot.baanxClientKey else { return nil }
                payload = try await BaanxClient.provision(
                    certificates: certificates,
                    nonce: nonce,
                    nonceSignature: nonceSignature,
                    tokens: tokens,
                    baseURL: base,
                    clientKey: clientKey,
                    http: http
                )
            } else {
                payload = try await ImmersveClient.provision(
                    cardId: card.cardId,
                    certificates: certificates,
                    nonce: nonce,
                    nonceSignature: nonceSignature,
                    tokens: tokens,
                    baseURL: base,
                    http: http
                )
            }
            let request = PKAddPaymentPassRequest()
            guard
                let encrypted = Data(base64Encoded: payload.encryptedPassData),
                let activation = Data(base64Encoded: payload.activationData),
                let ephemeral = Data(base64Encoded: payload.ephemeralPublicKey)
            else {
                return nil
            }
            request.encryptedPassData = encrypted
            request.activationData = activation
            request.ephemeralPublicKey = ephemeral
            return request
        } catch {
            log.error("Provisioning request failed")
            return nil
        }
    }

    private static func liveCards(
        snapshot: ProvisioningSnapshot,
        tokens: CardTokenSet,
        base: URL
    ) async throws -> [SnapshotCard] {
        let http = ProviderHTTP()
        if snapshot.providerId == "baanx" {
            guard let clientKey = snapshot.baanxClientKey else { return snapshot.cards }
            if let card = try await BaanxClient.card(tokens: tokens, baseURL: base, clientKey: clientKey, http: http) {
                return [card]
            }
            return snapshot.cards
        }
        return try await ImmersveClient.cards(tokens: tokens, baseURL: base, http: http)
    }

    private static func configuration(for card: SnapshotCard) -> PKAddPaymentPassRequestConfiguration? {
        guard let configuration = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2) else {
            return nil
        }
        configuration.cardholderName = card.cardholderName
        configuration.primaryAccountSuffix = card.lastFour
        configuration.localizedDescription = card.localizedDescription
        configuration.paymentNetwork = .masterCard
        configuration.style = .payment
        if let identifier = card.primaryAccountIdentifier, !identifier.isEmpty {
            configuration.primaryAccountIdentifier = identifier
        }
        return configuration
    }
}
