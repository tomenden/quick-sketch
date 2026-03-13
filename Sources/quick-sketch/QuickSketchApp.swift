import AppKit
import SwiftUI

@main
struct QuickSketchApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var appController = AppController.shared

    var body: some Scene {
        WindowGroup("Quick Sketch") {
            SketchRootView(
                sketchStore: appController.sketchStore,
                settingsStore: appController.shortcutSettings,
                copyAndClose: {
                    appController.copyAndClose()
                }
            )
                .background(WindowAccessor { window in
                    appController.windowCoordinator.attach(window: window)
                })
                .frame(minWidth: 720, minHeight: 620)
        }
        .defaultSize(width: 1040, height: 760)

        Settings {
            SettingsView()
        }
    }
}

@MainActor
final class AppController {
    static let shared = AppController()

    let sketchStore = SketchStore()
    let shortcutSettings = ShortcutSettingsStore()
    let windowCoordinator = WindowCoordinator()

    @discardableResult
    func copyAndClose() -> Bool {
        guard ClipboardService.copySketch(from: sketchStore) else {
            NSSound.beep()
            return false
        }

        if shortcutSettings.autoClearAfterCopyAndClose {
            sketchStore.clear()
        }

        windowCoordinator.hideWindow()
        return true
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private let appController = AppController.shared
    private var hotkeyManager: HotkeyManager?
    private var statusItemController: StatusItemController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)

        hotkeyManager = HotkeyManager(
            settings: appController.shortcutSettings,
            toggleHandler: { [weak appController] in
                appController?.windowCoordinator.toggleWindow()
            },
            copyHandler: { [weak appController] in
                appController?.copyAndClose()
            }
        )

        appController.shortcutSettings.onChange = { [weak self] in
            self?.hotkeyManager?.reloadShortcuts()
        }

        statusItemController = StatusItemController(
            toggleHandler: { [weak appController] in
                appController?.windowCoordinator.toggleWindow()
            },
            clearHandler: { [weak appController] in
                appController?.sketchStore.clear()
            },
            copyHandler: { [weak appController] in
                appController?.copyAndClose()
            }
        )
    }
}
