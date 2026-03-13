import AppKit

@MainActor
final class StatusItemController: NSObject {
    private let statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
    private let toggleHandler: () -> Void
    private let clearHandler: () -> Void
    private let copyHandler: () -> Void

    init(toggleHandler: @escaping () -> Void, clearHandler: @escaping () -> Void, copyHandler: @escaping () -> Void) {
        self.toggleHandler = toggleHandler
        self.clearHandler = clearHandler
        self.copyHandler = copyHandler
        super.init()

        if let button = statusItem.button {
            button.title = "Sketch"
        }

        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Open Sketch Pad", action: #selector(toggleWindow), keyEquivalent: "o"))
        menu.addItem(NSMenuItem(title: "Copy to Clipboard", action: #selector(copySketch), keyEquivalent: "c"))
        menu.addItem(NSMenuItem(title: "Clear Canvas", action: #selector(clearCanvas), keyEquivalent: "k"))
        menu.addItem(.separator())
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q"))

        menu.items.forEach { $0.target = self }
        statusItem.menu = menu
    }

    @objc private func toggleWindow() {
        toggleHandler()
    }

    @objc private func clearCanvas() {
        clearHandler()
    }

    @objc private func copySketch() {
        copyHandler()
    }

    @objc private func quit() {
        NSApp.terminate(nil)
    }
}
