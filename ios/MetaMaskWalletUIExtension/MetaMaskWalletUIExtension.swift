import Combine
import CoreText
import LocalAuthentication
import PassKit
import SwiftUI
import UIKit

class MetaMaskWalletUIExtension: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {
    @IBOutlet weak var imageView: UIImageView?
    var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?
    private let model = AuthorizationModel()
    private var didFinish = false

    override func viewDidLoad() {
        super.viewDidLoad()
        FontRegistration.registerBundledFonts()
        let root = AuthorizationView(model: model) { [weak self] result in
            self?.finish(result)
        }
        let controller = UIHostingController(rootView: root)
        addChild(controller)
        controller.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(controller.view)
        NSLayoutConstraint.activate([
            controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            controller.view.topAnchor.constraint(equalTo: view.topAnchor),
            controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        controller.didMove(toParent: self)
        model.start()
    }

    @IBAction func done() {
        finish(.canceled)
    }

    private func finish(_ result: PKIssuerProvisioningExtensionAuthorizationResult) {
        guard !didFinish else { return }
        didFinish = true
        completionHandler?(result)
    }
}

enum FontRegistration {
    static func registerBundledFonts() {
        let names = ["MMSans-Regular", "MMSans-Medium", "MMSans-Bold", "MMPoly-Regular"]
        for name in names {
            guard let url = Bundle.main.url(forResource: name, withExtension: "otf") else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
}

enum AuthorizationPhase {
    case checking
    case verify
    case signInRequired
    case baanxCredentials
    case baanxCode
    case unavailable
    case error
    case verificationFailed
}

final class AuthorizationModel: ObservableObject {
    @Published var phase: AuthorizationPhase = .checking
    @Published var email = ""
    @Published var password = ""
    @Published var code = ""
    @Published var statusMessage = ""
    private var loginSession: BaanxLoginSession?
    private var snapshot: ProvisioningSnapshot?

    var biometricTitle: String {
        let context = LAContext()
        _ = context.canEvaluatePolicy(.deviceOwnerAuthentication, error: nil)
        switch context.biometryType {
        case .faceID:
            return NSLocalizedString("Continue with Face ID", comment: "")
        case .touchID:
            return NSLocalizedString("Continue with Touch ID", comment: "")
        default:
            return NSLocalizedString("Continue with passcode", comment: "")
        }
    }

    func start() {
        phase = .checking
        Task { await authenticateAndRefresh() }
    }

    func retry() {
        start()
    }

    func submitCredentials() {
        guard let snapshot, let clientKey = snapshot.baanxClientKey, let base = URL(string: snapshot.apiBaseUrl) else {
            phase = .error
            return
        }
        let otp = phase == .baanxCode ? code : nil
        phase = .checking
        Task {
            do {
                var session: BaanxLoginSession
                if let existing = loginSession, otp != nil {
                    session = existing
                } else {
                    session = try await BaanxLoginClient.start(
                        baseURL: base,
                        clientKey: clientKey,
                        http: ProviderHTTP(timeout: 15)
                    )
                }
                let done = try await BaanxLoginClient.submit(
                    session: &session,
                    email: email,
                    password: password,
                    otpCode: otp,
                    baseURL: base,
                    clientKey: clientKey,
                    http: ProviderHTTP(timeout: 15)
                )
                loginSession = session
                if !done {
                    if let userId = session.userId {
                        try? await BaanxLoginClient.sendOTP(userId: userId, baseURL: base, clientKey: clientKey, http: ProviderHTTP(timeout: 15))
                    }
                    await MainActor.run { phase = .baanxCode }
                    return
                }
                let tokens = try await BaanxLoginClient.exchange(session: session, baseURL: base, clientKey: clientKey, http: ProviderHTTP(timeout: 15))
                try CardTokenKeychain.save(providerId: "baanx", tokens: tokens, password: ContainingAppFoxCode.read())
                await MainActor.run { finishAuthorized() }
            } catch {
                await MainActor.run { phase = .error }
            }
        }
    }

    private func authenticateAndRefresh() async {
        let context = LAContext()
        context.localizedCancelTitle = NSLocalizedString("Close", comment: "")
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            await MainActor.run { phase = .verificationFailed }
            return
        }
        let success = await withCheckedContinuation { continuation in
            context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: NSLocalizedString("Verify it's you", comment: "")) { ok, _ in
                continuation.resume(returning: ok)
            }
        }
        guard success else {
            await MainActor.run { phase = .verificationFailed }
            return
        }
        guard let snapshot = SnapshotStore.read(defaults: UserDefaults(suiteName: AppGroupLocator.identifier) ?? .standard) else {
            await MainActor.run { phase = .unavailable }
            return
        }
        self.snapshot = snapshot
        guard await FlagsClient.isEnabled(snapshot: snapshot) else {
            await MainActor.run { phase = .unavailable }
            return
        }
        if await SessionRefresh.usableTokens(snapshot: snapshot) != nil {
            await MainActor.run { finishAuthorized() }
            return
        }
        await MainActor.run {
            phase = snapshot.providerId == "baanx" ? .baanxCredentials : .signInRequired
        }
    }

    private func finishAuthorized() {
        phase = .checking
        NotificationCenter.default.post(name: .walletExtensionAuthorized, object: nil)
    }
}

extension Notification.Name {
    static let walletExtensionAuthorized = Notification.Name("walletExtensionAuthorized")
}

struct AuthorizationView: View {
    @ObservedObject var model: AuthorizationModel
    var onFinish: (PKIssuerProvisioningExtensionAuthorizationResult) -> Void

    var body: some View {
        ZStack {
            WalletColor.background.ignoresSafeArea()
            VStack(spacing: 24) {
                fox
                content
            }
            .padding(24)
        }
        .onReceive(NotificationCenter.default.publisher(for: .walletExtensionAuthorized)) { _ in
            onFinish(.authorized)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .checking:
            ProgressView()
                .tint(WalletColor.primary)
            Text("Checking your MetaMask Card")
                .font(WalletFont.body)
                .foregroundStyle(WalletColor.text)
        case .verify:
            Text("Verify it's you")
                .font(WalletFont.title)
                .foregroundStyle(WalletColor.text)
            primaryButton(model.biometricTitle) { model.start() }
        case .signInRequired:
            Text("Open MetaMask and sign in to your MetaMask Card, then return to Wallet.")
                .font(WalletFont.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(WalletColor.text)
            primaryButton("Close") { onFinish(.canceled) }
        case .baanxCredentials:
            Text("Sign in to MetaMask Card")
                .font(WalletFont.title)
                .foregroundStyle(WalletColor.text)
            field("Email", text: $model.email)
            SecureField("Password", text: $model.password)
                .textFieldStyle(.roundedBorder)
            primaryButton("Continue") { model.submitCredentials() }
            secondaryButton("Close") { onFinish(.canceled) }
        case .baanxCode:
            Text("Enter the code we sent you")
                .font(WalletFont.title)
                .foregroundStyle(WalletColor.text)
            field("Code", text: $model.code)
            primaryButton("Continue") { model.submitCredentials() }
            secondaryButton("Close") { onFinish(.canceled) }
        case .unavailable:
            Text("There's no card available to add right now.")
                .font(WalletFont.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(WalletColor.text)
            primaryButton("Close") { onFinish(.canceled) }
        case .error:
            Text("Something went wrong.")
                .font(WalletFont.body)
                .foregroundStyle(WalletColor.error)
            primaryButton("Try again") { model.retry() }
            secondaryButton("Close") { onFinish(.canceled) }
        case .verificationFailed:
            Text("Verification failed or was canceled.")
                .font(WalletFont.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(WalletColor.text)
            primaryButton("Try again") { model.retry() }
            secondaryButton("Close") { onFinish(.canceled) }
        }
    }

    private var fox: some View {
        Group {
            if let url = Bundle.main.url(forResource: "fox", withExtension: "png"),
               let data = try? Data(contentsOf: url),
               let image = UIImage(data: data) {
                Image(uiImage: image).resizable().frame(width: 72, height: 72)
            }
        }
    }

    private func field(_ title: String, text: Binding<String>) -> some View {
        TextField(title, text: text)
            .textFieldStyle(.roundedBorder)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
    }

    private func primaryButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(WalletFont.button)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
        }
        .buttonStyle(.plain)
        .foregroundStyle(Color.white)
        .background(WalletColor.primary)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func secondaryButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .font(WalletFont.body)
            .foregroundStyle(WalletColor.text)
    }
}

enum WalletColor {
    /// Light and dark values from `@metamask/design-tokens` 11.1.0
    /// (`background`, `text`, `primary`, and `error` `.default`).
    static let background = adaptive(light: 0xFFFFFF, dark: 0x000000)
    static let text = adaptive(light: 0x131416, dark: 0xFFFFFF)
    static let primary = adaptive(light: 0x4459FF, dark: 0x8B99FF)
    static let error = adaptive(light: 0xCA3542, dark: 0xFF7584)

    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            uiColor(traits.userInterfaceStyle == .dark ? dark : light)
        })
    }

    private static func uiColor(_ hex: UInt32) -> UIColor {
        UIColor(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

enum WalletFont {
    static let title = Font.custom("MM Sans", size: 22).weight(.bold)
    static let body = Font.custom("MM Sans", size: 16)
    static let button = Font.custom("MM Sans", size: 16).weight(.medium)
}
