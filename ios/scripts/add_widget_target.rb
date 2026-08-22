#!/usr/bin/env ruby
# Adds the MetaMaskWidget WidgetKit extension target and the RCTWidgetBridge
# native module to ios/MetaMask.xcodeproj. Idempotent: safe to re-run.
#
# Run from the ios/ directory:  ruby scripts/add_widget_target.rb

require 'xcodeproj'

PROJECT_PATH = 'MetaMask.xcodeproj'
APP_TARGET_NAME = 'MetaMask'
WIDGET_TARGET_NAME = 'MetaMaskWidget'
TEAM = '48XVW22RCG'
DEPLOYMENT_TARGET = '15.1'
MARKETING_VERSION = '8.1.0'
CURRENT_PROJECT_VERSION = '4823'

WIDGET_SOURCES = %w[
  MetaMaskWidget/MetaMaskWidget.swift
  MetaMaskWidget/Provider.swift
  MetaMaskWidget/WidgetToken.swift
  MetaMaskWidget/TokenRowView.swift
  MetaMaskWidget/WidgetEntryView.swift
].freeze
WIDGET_RESOURCES = %w[MetaMaskWidget/Assets.xcassets].freeze
WIDGET_SUPPORT_FILES = %w[
  MetaMaskWidget/Info.plist
  MetaMaskWidget/MetaMaskWidget.entitlements
].freeze

BRIDGE_FILES = %w[
  MetaMask/NativeModules/RCTWidgetBridge/RCTWidgetBridge.swift
  MetaMask/NativeModules/RCTWidgetBridge/RCTWidgetBridge.m
].freeze

project = Xcodeproj::Project.open(PROJECT_PATH)
app_target = project.targets.find { |t| t.name == APP_TARGET_NAME }
raise "App target #{APP_TARGET_NAME} not found" unless app_target

# Helper: find-or-create a nested group by path segments under main_group.
def group_at(project, *segments)
  group = project.main_group
  segments.each do |seg|
    found = group.children.find { |c| c.is_a?(Xcodeproj::Project::Object::PBXGroup) && c.display_name == seg }
    group = found || group.new_group(seg, seg)
  end
  group
end

# ---------------------------------------------------------------------------
# 1. RCTWidgetBridge native module -> MetaMask app target only.
# ---------------------------------------------------------------------------
bridge_group = group_at(project, 'MetaMask', 'NativeModules', 'RCTWidgetBridge')
# The parent MetaMask/NativeModules groups are pathless logical groups, so the
# leaf group must carry the full path relative to SOURCE_ROOT for the files to
# resolve on disk.
bridge_group.source_tree = 'SOURCE_ROOT'
bridge_group.path = 'MetaMask/NativeModules/RCTWidgetBridge'
BRIDGE_FILES.each do |path|
  next if project.files.any? { |f| f.path == File.basename(path) && (f.parent == bridge_group) }
  ref = bridge_group.new_reference(File.basename(path))
  if path.end_with?('.swift', '.m')
    app_target.source_build_phase.add_file_reference(ref, true)
  end
end

# ---------------------------------------------------------------------------
# 2. MetaMaskWidget app-extension target.
# ---------------------------------------------------------------------------
widget_target = project.targets.find { |t| t.name == WIDGET_TARGET_NAME }
unless widget_target
  widget_target = project.new_target(
    :app_extension, WIDGET_TARGET_NAME, :ios, DEPLOYMENT_TARGET, nil, :swift
  )
end

widget_group = group_at(project, WIDGET_TARGET_NAME)

# Source files.
WIDGET_SOURCES.each do |path|
  base = File.basename(path)
  ref = widget_group.children.find { |c| c.respond_to?(:path) && c.path == base }
  ref ||= widget_group.new_reference(base)
  unless widget_target.source_build_phase.files_references.include?(ref)
    widget_target.source_build_phase.add_file_reference(ref, true)
  end
end

# Resources (asset catalog).
WIDGET_RESOURCES.each do |path|
  base = File.basename(path)
  ref = widget_group.children.find { |c| c.respond_to?(:path) && c.path == base }
  ref ||= widget_group.new_reference(base)
  unless widget_target.resources_build_phase.files_references.include?(ref)
    widget_target.resources_build_phase.add_file_reference(ref)
  end
end

# Support files (referenced via build settings, not compiled).
WIDGET_SUPPORT_FILES.each do |path|
  base = File.basename(path)
  next if widget_group.children.any? { |c| c.respond_to?(:path) && c.path == base }
  widget_group.new_reference(base)
end

# Build settings.
widget_target.build_configurations.each do |config|
  bs = config.build_settings
  bs['PRODUCT_NAME'] = '$(TARGET_NAME)'
  bs['PRODUCT_BUNDLE_IDENTIFIER'] = 'io.metamask.MetaMask.MetaMaskWidget'
  bs['INFOPLIST_FILE'] = 'MetaMaskWidget/Info.plist'
  bs['CODE_SIGN_ENTITLEMENTS'] = 'MetaMaskWidget/MetaMaskWidget.entitlements'
  bs['GENERATE_INFOPLIST_FILE'] = 'NO'
  bs['SWIFT_VERSION'] = '5.0'
  bs['IPHONEOS_DEPLOYMENT_TARGET'] = DEPLOYMENT_TARGET
  bs['TARGETED_DEVICE_FAMILY'] = '1,2'
  bs['MARKETING_VERSION'] = MARKETING_VERSION
  bs['CURRENT_PROJECT_VERSION'] = CURRENT_PROJECT_VERSION
  bs['SKIP_INSTALL'] = 'NO'
  bs['CODE_SIGN_STYLE'] = 'Manual'
  bs['DEVELOPMENT_TEAM'] = TEAM
  bs['LD_RUNPATH_SEARCH_PATHS'] = [
    '$(inherited)', '@executable_path/Frameworks',
    '@executable_path/../../Frameworks'
  ]
  bs['ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS'] = 'NO'
  # Local/simulator builds work with a development identity and no profile.
  # Device + App Store signing uses the manual profiles created in the portal;
  # set their names here once they exist (see the widget setup doc).
  bs['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = 'Apple Development'
  if config.name == 'Release'
    bs['CODE_SIGN_IDENTITY[sdk=iphoneos*]'] = 'iPhone Distribution'
    bs['SWIFT_OPTIMIZATION_LEVEL'] = '-O'
  else
    bs['SWIFT_OPTIMIZATION_LEVEL'] = '-Onone'
    bs['SWIFT_ACTIVE_COMPILATION_CONDITIONS'] = 'DEBUG'
  end
end

# ---------------------------------------------------------------------------
# 3. Embed the .appex into the MetaMask app target + dependency.
# ---------------------------------------------------------------------------
# Build the target dependency manually. We avoid PBXNativeTarget#add_dependency
# because it scans every file reference's real_path, which trips over a
# pre-existing project inconsistency (SplashScreen.storyboard has duplicate
# build-file entries) unrelated to this change.
already_dep = app_target.dependencies.any? { |d| d.target&.uuid == widget_target.uuid }
unless already_dep
  proxy = project.new(Xcodeproj::Project::Object::PBXContainerItemProxy)
  proxy.container_portal = project.root_object.uuid
  proxy.proxy_type = '1'
  proxy.remote_global_id_string = widget_target.uuid
  proxy.remote_info = widget_target.name

  dependency = project.new(Xcodeproj::Project::Object::PBXTargetDependency)
  dependency.target = widget_target
  dependency.target_proxy = proxy
  app_target.dependencies << dependency
end

embed_phase = app_target.copy_files_build_phases.find { |p| p.name == 'Embed App Extensions' }
unless embed_phase
  embed_phase = app_target.new_copy_files_build_phase('Embed App Extensions')
  embed_phase.symbol_dst_subfolder_spec = :plug_ins
end
appex_ref = widget_target.product_reference
unless embed_phase.files_references.include?(appex_ref)
  bf = embed_phase.add_file_reference(appex_ref)
  bf.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
end

# Position the embed phase right after "Embed Frameworks". Appending it after the
# JS-bundle / Sentry / Strip-Bitcode script phases (which declare no outputs)
# produces a "Cycle inside MetaMask" build error.
embed_fw = app_target.build_phases.find { |p| p.respond_to?(:name) && p.name == 'Embed Frameworks' }
if embed_fw
  app_target.build_phases.delete(embed_phase)
  app_target.build_phases.insert(app_target.build_phases.index(embed_fw) + 1, embed_phase)
end

project.save
puts "Done. Targets now: #{project.targets.map(&:name).join(', ')}"
