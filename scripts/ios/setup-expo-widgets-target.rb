#!/usr/bin/env ruby
# frozen_string_literal: true

# Creates (or updates) the `ExpoWidgetsTarget` WidgetKit extension target in
# ios/MetaMask.xcodeproj.
#
# WHY THIS SCRIPT EXISTS
# -----------------------
# `expo-widgets` ships a config plugin that normally performs this exact setup
# during `expo prebuild` / Continuous Native Generation. This repo is a bare
# React Native app with a checked-in `ios/` directory and does NOT run
# `expo prebuild` against it (the plugins declared in app.config.js are only
# applied by @expo/repack-app for OTA repackaging, never to this Xcode
# project). This script reproduces, by hand, exactly what that config plugin
# would do to the Xcode project, using the same target name, bundle
# identifier convention, deployment target, and build settings documented in
# the plugin source (github.com/expo/expo, `sdk-55` branch,
# packages/expo-widgets/plugin/src/**).
#
# WHEN TO RE-RUN THIS
# --------------------
# - Never, for day-to-day widget development. Editing the Swift files under
#   ios/ExpoWidgetsTarget/ and the JS/TSX widget code does not require
#   touching the Xcode project.
# - Re-run it only if the `ExpoWidgetsTarget` target is ever deleted from the
#   project and needs to be recreated (idempotent: exits early if the target
#   already exists).
#
# See docs/widgets/README.md for the full picture (architecture, limitations,
# and what to do when adding a brand-new widget kind, which still requires a
# manual Swift file + Xcode "Sources" build phase membership + app.config.js
# entry, but does NOT require re-running this script).
#
# Usage: ruby scripts/ios/setup-expo-widgets-target.rb

require 'xcodeproj'

IOS_DIR = File.expand_path('../../ios', __dir__)
PROJECT_PATH = File.join(IOS_DIR, 'MetaMask.xcodeproj')
MAIN_TARGET_NAME = 'MetaMask'
WIDGETS_TARGET_NAME = 'ExpoWidgetsTarget'
DEPLOYMENT_TARGET = '16.2' # Hardcoded by the expo-widgets config plugin on SDK 55.
GROUP_IDENTIFIER = 'group.io.metamask.MetaMask'
EMBED_PHASE_NAME = 'Embed Foundation Extensions'

def main
  project = Xcodeproj::Project.open(PROJECT_PATH)

  if project.targets.any? { |t| t.name == WIDGETS_TARGET_NAME }
    main_target = project.targets.find { |t| t.name == MAIN_TARGET_NAME }
    embed_phase = main_target && main_target.copy_files_build_phases.find { |p| p.name == EMBED_PHASE_NAME }
    if embed_phase
      before = main_target.build_phases.index(embed_phase)
      reorder_embed_extension_phase(main_target, embed_phase)
      after = main_target.build_phases.index(embed_phase)
      if before != after
        project.save
        puts "[setup-expo-widgets-target] '#{WIDGETS_TARGET_NAME}' target already exists — fixed '#{EMBED_PHASE_NAME}' build phase order (moved from index #{before} to #{after})."
      else
        puts "[setup-expo-widgets-target] '#{WIDGETS_TARGET_NAME}' target already exists — nothing to do."
      end
    else
      puts "[setup-expo-widgets-target] '#{WIDGETS_TARGET_NAME}' target already exists — nothing to do."
    end
    return
  end

  main_target = project.targets.find { |t| t.name == MAIN_TARGET_NAME }
  raise "Could not find main app target '#{MAIN_TARGET_NAME}'" unless main_target

  bundle_identifier = "#{bundle_identifier_for(main_target)}.#{WIDGETS_TARGET_NAME}"
  development_team = main_target.build_configurations.first.build_settings['DEVELOPMENT_TEAM']
  marketing_version = main_target.build_configurations.first.build_settings['MARKETING_VERSION']
  current_project_version = main_target.build_configurations.first.build_settings['CURRENT_PROJECT_VERSION']

  widgets_target = project.new_target(
    :app_extension,
    WIDGETS_TARGET_NAME,
    :ios,
    DEPLOYMENT_TARGET,
    project.products_group,
    :swift
  )

  configure_build_settings(
    widgets_target,
    bundle_identifier: bundle_identifier,
    development_team: development_team,
    marketing_version: marketing_version,
    current_project_version: current_project_version,
  )

  widgets_group = add_source_files(project, widgets_target)

  add_embed_extension_phase(project, main_target, widgets_target)

  add_target_dependency(project, main_target, widgets_target)

  project.save

  puts "[setup-expo-widgets-target] Created '#{WIDGETS_TARGET_NAME}' target."
  puts "[setup-expo-widgets-target] Bundle identifier: #{bundle_identifier}"
  puts "[setup-expo-widgets-target] App Group: #{GROUP_IDENTIFIER}"
  puts "[setup-expo-widgets-target] Source group: #{widgets_group.hierarchy_path}"
  puts '[setup-expo-widgets-target] Remember to run `bundle exec pod install` next.'
end

def bundle_identifier_for(target)
  raw = target.build_configurations.first.build_settings['PRODUCT_BUNDLE_IDENTIFIER']
  # The MetaMask target uses "io.metamask.$(PRODUCT_NAME:rfc1034identifier)";
  # expo-widgets' fallback bundle id is always derived from `ios.bundleIdentifier`
  # in app.config.js, i.e. the resolved (non-variable) identifier.
  raw.include?('$(PRODUCT_NAME') ? 'io.metamask.MetaMask' : raw
end

def configure_build_settings(target, bundle_identifier:, development_team:, marketing_version:, current_project_version:)
  target.build_configurations.each do |config|
    config.build_settings.merge!(
      'PRODUCT_NAME' => '$(TARGET_NAME)',
      'SWIFT_VERSION' => '5.0',
      'TARGETED_DEVICE_FAMILY' => '1,2',
      'INFOPLIST_FILE' => "#{WIDGETS_TARGET_NAME}/Info.plist",
      'GENERATE_INFOPLIST_FILE' => 'YES',
      'INFOPLIST_KEY_CFBundleDisplayName' => 'MetaMask Widgets',
      'INFOPLIST_KEY_NSHumanReadableCopyright' => '',
      'CURRENT_PROJECT_VERSION' => current_project_version || '1',
      'MARKETING_VERSION' => marketing_version || '1.0',
      'IPHONEOS_DEPLOYMENT_TARGET' => DEPLOYMENT_TARGET,
      'PRODUCT_BUNDLE_IDENTIFIER' => bundle_identifier,
      'CODE_SIGN_ENTITLEMENTS' => "#{WIDGETS_TARGET_NAME}/#{WIDGETS_TARGET_NAME}.entitlements",
      'APPLICATION_EXTENSION_API_ONLY' => 'YES',
      'SWIFT_OPTIMIZATION_LEVEL' => config.name == 'Debug' ? '-Onone' : '-O',
      # The main app target uses manual signing tied to profiles that predate
      # this extension. Automatic signing lets local/dev builds provision the
      # new bundle id + App Group on the fly. CI/release builds need a real
      # provisioning profile for this bundle id created in the Apple Developer
      # portal (see docs/widgets/README.md#provisioning) before switching this
      # to Manual.
      'CODE_SIGN_STYLE' => 'Automatic',
    )
    config.build_settings['DEVELOPMENT_TEAM'] = development_team if development_team
  end
end

def add_source_files(project, target)
  widgets_group = project.main_group.find_subpath(WIDGETS_TARGET_NAME, true)
  widgets_group.set_source_tree('<group>')
  widgets_group.set_path(WIDGETS_TARGET_NAME)

  swift_files = Dir.glob(File.join(IOS_DIR, WIDGETS_TARGET_NAME, '*.swift')).sort
  swift_files.each do |path|
    file_ref = widgets_group.new_reference(File.basename(path))
    target.add_file_references([file_ref])
  end

  %w[Info.plist].each do |name|
    path = File.join(IOS_DIR, WIDGETS_TARGET_NAME, name)
    widgets_group.new_reference(File.basename(path)) if File.exist?(path)
  end

  entitlements_path = File.join(IOS_DIR, WIDGETS_TARGET_NAME, "#{WIDGETS_TARGET_NAME}.entitlements")
  widgets_group.new_reference(File.basename(entitlements_path)) if File.exist?(entitlements_path)

  widgets_group
end

# Reimplements `PBXNativeTarget#add_dependency` without its existence check
# (`dependency_for_target`), which walks every file reference in the project
# to resolve `real_path` for *any* pre-existing remote/proxy dependency (e.g.
# the vendored `Branch` framework subproject reference) and raises on
# unrelated, pre-existing pbxproj consistency issues (dangling `PBXBuildFile`
# entries) that have nothing to do with this new target. Safe here because
# the caller already verified `WIDGETS_TARGET_NAME` doesn't exist yet, so a
# duplicate-dependency check is unnecessary.
def add_target_dependency(project, main_target, widgets_target)
  container_proxy = project.new(Xcodeproj::Project::PBXContainerItemProxy)
  container_proxy.container_portal = project.root_object.uuid
  container_proxy.proxy_type = Xcodeproj::Constants::PROXY_TYPES[:native_target]
  container_proxy.remote_global_id_string = widgets_target.uuid
  container_proxy.remote_info = widgets_target.name

  dependency = project.new(Xcodeproj::Project::PBXTargetDependency)
  dependency.name = widgets_target.name
  dependency.target = widgets_target
  dependency.target_proxy = container_proxy

  main_target.dependencies << dependency
end

def add_embed_extension_phase(project, main_target, widgets_target)
  embed_phase = main_target.copy_files_build_phases.find { |p| p.name == EMBED_PHASE_NAME }
  embed_phase ||= main_target.new_copy_files_build_phase(EMBED_PHASE_NAME)
  embed_phase.symbol_dst_subfolder_spec = :plug_ins
  embed_phase.dst_path = ''

  product_ref = widgets_target.product_reference
  build_file = embed_phase.add_file_reference(product_ref, true)
  build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

  reorder_embed_extension_phase(main_target, embed_phase)
end

# `new_copy_files_build_phase` always appends the phase at the end of the
# target's build phase list. Left last, it sits after several run-script
# phases with no declared outputs ("Bundle JS Code & Upload Sentry Files",
# "[CP] Embed Pods Frameworks", etc.), which Xcode's build system treats as
# touching the whole app bundle on every build. A copy-into-bundle phase
# placed after those creates a circular dependency, causing:
# "error: Cycle inside MetaMask; building could produce unreliable results."
#
# Xcode's own project templates place "Embed Foundation Extensions"
# immediately after "Embed Frameworks" (right after Sources/Frameworks/
# Resources, before any script phases) — mirror that ordering here.
def reorder_embed_extension_phase(main_target, embed_phase)
  phases = main_target.build_phases
  anchor = phases.index { |p| p.is_a?(Xcodeproj::Project::Object::PBXCopyFilesBuildPhase) && p.name == 'Embed Frameworks' } ||
           phases.index { |p| p.is_a?(Xcodeproj::Project::Object::PBXResourcesBuildPhase) }
  return unless anchor

  phases.move(embed_phase, anchor + 1)
end

main
