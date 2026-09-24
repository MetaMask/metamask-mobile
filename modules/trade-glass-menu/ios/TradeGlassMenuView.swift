import ExpoModulesCore

/// The button the menu grows out of, in this view's own coordinate space.
struct TradeGlassMenuAnchor: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0
  @Field var width: Double = 0
  @Field var height: Double = 0

  var rect: CGRect {
    CGRect(x: x, y: y, width: width, height: height)
  }
}

enum TradeGlassMenuColorScheme: String, Enumerable {
  case auto
  case light
  case dark

  func toUIUserInterfaceStyle() -> UIUserInterfaceStyle {
    switch self {
    case .auto: return .unspecified
    case .light: return .light
    case .dark: return .dark
    }
  }
}

/**
 A Liquid Glass menu that grows out of the button that opened it.

 Both the menu and a stand-in for its button are glass siblings inside a
 `UIGlassContainerEffect`, so UIKit fuses and splits them the way SpringBoard
 does rather than us imitating it. The geometry is animated by UIKit, off the
 React Native commit path, and the rows are laid out once at their final size
 and revealed by a clip that tracks the menu.
 */
public final class TradeGlassMenuView: ExpoView {
  private let containerEffectView = UIVisualEffectView()
  private let anchorGlassView = UIVisualEffectView()
  private let menuGlassView = UIVisualEffectView()
  private let contentClipView = UIView()
  private let contentView = UIView()

  private var containerEffect: Any?
  private var anchorEffect: Any?
  private var menuEffect: Any?
  private var animator: UIViewPropertyAnimator?

  private var anchor: CGRect = .zero
  private var expandedHeight: CGFloat = 0
  private var horizontalInset: CGFloat = 16
  private var gap: CGFloat = 16
  private var menuCornerRadius: CGFloat = 24
  private var mergeSpacing: CGFloat = 24
  private var colorScheme: TradeGlassMenuColorScheme = .auto
  private var isOpen = false
  private var presentedOpen = false
  private var hasAnimated = false

  let onCollapsed = EventDispatcher()

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    containerEffectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    contentClipView.clipsToBounds = true
    contentClipView.layer.cornerCurve = .continuous
    // Keeps the rows pinned to the bottom edge as the clip grows upward.
    contentView.autoresizingMask = [.flexibleTopMargin]
    contentClipView.alpha = 0

    containerEffectView.contentView.addSubview(anchorGlassView)
    containerEffectView.contentView.addSubview(menuGlassView)
    contentClipView.addSubview(contentView)
    addSubview(containerEffectView)
    // The rows sit above the glass rather than inside it, so the blob is free
    // to bulge past the clip while the two shapes fuse.
    addSubview(contentClipView)
  }

  // UIGlassEffect crashes on some iOS 26 betas, so probe before constructing it.
  // https://github.com/expo/expo/issues/40911
  private func isGlassEffectAvailable() -> Bool {
    #if compiler(>=6.2)
      if #available(iOS 26.0, *) {
        guard let glassEffectClass = NSClassFromString("UIGlassEffect") as? NSObject.Type else {
          return false
        }
        return glassEffectClass.responds(to: Selector(("effectWithStyle:")))
      }
    #endif
    return false
  }

  private func isGlassContainerEffectAvailable() -> Bool {
    #if compiler(>=6.2)
      if #available(iOS 26.0, *) {
        return NSClassFromString("UIGlassContainerEffect") != nil
      }
    #endif
    return false
  }

  public override func layoutSubviews() {
    super.layoutSubviews()

    updateEffects()
    // Until the menu has animated, UIKit owns no in-flight geometry, so a
    // bounds change (rotation, keyboard) re-seats it rather than fighting it.
    if !hasAnimated {
      applyGeometry(open: false)
    }
    updateOpenState()
  }

  private var expandedRect: CGRect {
    CGRect(
      x: horizontalInset,
      y: anchor.minY - gap - expandedHeight,
      width: bounds.width - horizontalInset * 2,
      height: expandedHeight
    )
  }

  private func menuRect(open: Bool) -> CGRect {
    open ? expandedRect : anchor
  }

  private func applyGeometry(open: Bool) {
    let frame = menuRect(open: open)
    anchorGlassView.frame = anchor
    menuGlassView.frame = frame
    contentClipView.frame = frame
    contentClipView.layer.cornerRadius = open ? menuCornerRadius : anchor.height / 2
    contentView.frame = CGRect(
      x: 0,
      y: frame.height - expandedHeight,
      width: expandedRect.width,
      height: expandedHeight
    )
    contentClipView.alpha = open ? 1 : 0
    applyCorners(open: open)
  }

  /// Glass takes its shape from the corner configuration, not the layer radius.
  private func applyCorners(open: Bool) {
    guard isGlassEffectAvailable() else {
      return
    }
    #if compiler(>=6.2)
      if #available(iOS 26.0, *) {
        anchorGlassView.cornerConfiguration = .capsule()
        menuGlassView.cornerConfiguration =
          open ? .uniformCorners(radius: .fixed(menuCornerRadius)) : .capsule()
      }
    #endif
  }

  private func updateEffects() {
    guard isGlassEffectAvailable() else {
      return
    }
    #if compiler(>=6.2)
      if #available(iOS 26.0, *) {
        if containerEffect == nil, isGlassContainerEffectAvailable() {
          let effect = UIGlassContainerEffect()
          effect.spacing = mergeSpacing
          containerEffect = effect
        }
        if anchorEffect == nil {
          anchorEffect = UIGlassEffect(style: .regular)
        }
        if menuEffect == nil {
          menuEffect = UIGlassEffect(style: .regular)
        }
        let style = colorScheme.toUIUserInterfaceStyle()
        containerEffectView.overrideUserInterfaceStyle = style
        anchorGlassView.overrideUserInterfaceStyle = style
        menuGlassView.overrideUserInterfaceStyle = style
        // Re-assigning is what makes UIKit pick the effects up.
        containerEffectView.effect = containerEffect as? UIGlassContainerEffect
        anchorGlassView.effect = anchorEffect as? UIGlassEffect
        menuGlassView.effect = menuEffect as? UIGlassEffect
      }
    #endif
  }

  private func animate(open: Bool) {
    animator?.stopAnimation(true)

    // Reduce Motion keeps the cross-fade but drops the travel, so the menu
    // appears where it belongs instead of flying there.
    if UIAccessibility.isReduceMotionEnabled {
      applyGeometry(open: true)
      UIView.animate(withDuration: open ? 0.14 : 0.09) {
        self.contentClipView.alpha = open ? 1 : 0
      } completion: { _ in
        if !open {
          self.onCollapsed()
        }
      }
      return
    }

    let animator: UIViewPropertyAnimator
    if open {
      // Response 0.35s at a 0.72 damping ratio: the SpringBoard context menu.
      let spring = UISpringTimingParameters(
        mass: 1,
        stiffness: 322,
        damping: 26,
        initialVelocity: .zero
      )
      animator = UIViewPropertyAnimator(duration: 0, timingParameters: spring)
    } else {
      animator = UIViewPropertyAnimator(duration: 0.18, curve: .easeIn)
    }

    animator.addAnimations {
      let frame = self.menuRect(open: open)
      self.menuGlassView.frame = frame
      self.contentClipView.frame = frame
      self.contentClipView.layer.cornerRadius =
        open ? self.menuCornerRadius : self.anchor.height / 2
      self.contentView.frame = CGRect(
        x: 0,
        y: frame.height - self.expandedHeight,
        width: self.expandedRect.width,
        height: self.expandedHeight
      )
      self.applyCorners(open: open)
    }
    animator.addCompletion { position in
      guard position == .end, !open else {
        return
      }
      self.onCollapsed()
    }
    animator.startAnimation()
    self.animator = animator

    // The rows cross-fade at their final size, so labels never stretch.
    UIView.animate(withDuration: open ? 0.14 : 0.09) {
      self.contentClipView.alpha = open ? 1 : 0
    }
  }

  /// Runs once both the anchor and the measured height have arrived.
  private func updateOpenState() {
    guard expandedHeight > 0, anchor.height > 0, isOpen != presentedOpen else {
      return
    }
    if isOpen && !hasAnimated {
      applyGeometry(open: false)
    }
    presentedOpen = isOpen
    hasAnimated = true
    animate(open: isOpen)
  }

  func setAnchor(_ anchor: TradeGlassMenuAnchor?) {
    self.anchor = anchor?.rect ?? .zero
    setNeedsLayout()
  }

  func setExpandedHeight(_ height: CGFloat) {
    guard height != expandedHeight else {
      return
    }
    expandedHeight = height
    setNeedsLayout()
    updateOpenState()
  }

  func setHorizontalInset(_ inset: CGFloat) {
    horizontalInset = inset
    setNeedsLayout()
  }

  func setGap(_ gap: CGFloat) {
    self.gap = gap
    setNeedsLayout()
  }

  func setMenuCornerRadius(_ radius: CGFloat) {
    menuCornerRadius = radius
    setNeedsLayout()
  }

  /// How close the two shapes must be before UIKit starts fusing them.
  func setMergeSpacing(_ spacing: CGFloat) {
    guard spacing != mergeSpacing else {
      return
    }
    mergeSpacing = spacing
    containerEffect = nil
    updateEffects()
  }

  func setColorScheme(_ colorScheme: TradeGlassMenuColorScheme) {
    guard colorScheme != self.colorScheme else {
      return
    }
    self.colorScheme = colorScheme
    updateEffects()
  }

  func setIsOpen(_ isOpen: Bool) {
    guard isOpen != self.isOpen else {
      return
    }
    self.isOpen = isOpen
    // Opening before the rows have measured would animate to a zero-height
    // menu, so the open waits for whichever of the two lands last.
    updateOpenState()
  }

  public override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    contentView.insertSubview(childComponentView, at: index)
  }

  public override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    childComponentView.removeFromSuperview()
  }
}
