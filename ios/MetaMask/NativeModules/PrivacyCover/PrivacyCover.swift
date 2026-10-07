import UIKit

/// The iOS privacy cover. `AppDelegate` shows it from
/// `applicationDidEnterBackground` and `PrivacyCoverModule` hides it once
/// resume routing resolves. Not shown for `inactive` (Control Center, the
/// app-switcher gesture).
///
/// Splash background plus the centered splash fox, matching the Android cover.
/// A separate window so it sits above native-stack modals.
@objc(PrivacyCover)
final class PrivacyCover: NSObject {
  @objc static let shared = PrivacyCover()

  private var coverWindow: UIWindow?
  private let foxSide: CGFloat = 144

  private override init() {
    super.init()
  }

  @objc func show(in host: UIWindow?) {
    let scene = coverWindow?.windowScene ?? host?.windowScene
    guard let scene else {
      return
    }
    let window = coverWindow ?? makeWindow(for: scene)
    window.frame = scene.coordinateSpace.bounds
    window.isHidden = false
  }

  @objc func hide() {
    coverWindow?.isHidden = true
  }

  private func makeWindow(for scene: UIWindowScene) -> UIWindow {
    let window = UIWindow(windowScene: scene)
    window.windowLevel = .alert + 1
    let root = UIViewController()
    root.view.backgroundColor = UIColor(named: "splashBackground") ?? .systemBackground

    let fox = UIImageView(image: UIImage(named: "fox-splash-screen"))
    fox.translatesAutoresizingMaskIntoConstraints = false
    fox.contentMode = .scaleAspectFit
    root.view.addSubview(fox)
    NSLayoutConstraint.activate([
      fox.centerXAnchor.constraint(equalTo: root.view.centerXAnchor),
      fox.centerYAnchor.constraint(equalTo: root.view.centerYAnchor),
      fox.widthAnchor.constraint(equalToConstant: foxSide),
      fox.heightAnchor.constraint(equalToConstant: foxSide),
    ])

    window.rootViewController = root
    coverWindow = window
    return window
  }
}
