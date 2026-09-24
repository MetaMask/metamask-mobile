import ExpoModulesCore

public final class TradeGlassMenuModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TradeGlassMenu")

    View(TradeGlassMenuView.self) {
      Events("onCollapsed")

      Prop("anchor") { (view, anchor: TradeGlassMenuAnchor?) in
        view.setAnchor(anchor)
      }

      Prop("expandedHeight") { (view, height: CGFloat) in
        view.setExpandedHeight(height)
      }

      Prop("horizontalInset", 16) { (view, inset: CGFloat) in
        view.setHorizontalInset(inset)
      }

      Prop("gap", 16) { (view, gap: CGFloat) in
        view.setGap(gap)
      }

      Prop("menuCornerRadius", 24) { (view, radius: CGFloat) in
        view.setMenuCornerRadius(radius)
      }

      Prop("colorScheme", .auto) { (view, colorScheme: TradeGlassMenuColorScheme) in
        view.setColorScheme(colorScheme)
      }

      Prop("isOpen", false) { (view, isOpen: Bool) in
        view.setIsOpen(isOpen)
      }
    }
  }
}
