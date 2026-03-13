import Carbon
import Foundation

final class HotkeyManager {
    private enum Shortcut: UInt32 {
        case toggle = 1
        case copy = 2
    }

    private let toggleHandler: @MainActor @Sendable () -> Void
    private let copyHandler: @MainActor @Sendable () -> Void
    private var eventHandlerRef: EventHandlerRef?
    private var hotKeyRefs: [EventHotKeyRef?] = []
    private let settings: ShortcutSettingsStore

    init(
        settings: ShortcutSettingsStore,
        toggleHandler: @escaping @MainActor @Sendable () -> Void,
        copyHandler: @escaping @MainActor @Sendable () -> Void
    ) {
        self.settings = settings
        self.toggleHandler = toggleHandler
        self.copyHandler = copyHandler

        registerHotkeys()
        installHandler()
    }

    deinit {
        if let eventHandlerRef {
            RemoveEventHandler(eventHandlerRef)
        }
    }

    private func registerHotkeys() {
        unregisterHotkeys()

        let toggle = settings.shortcut(for: .toggleWindow)
        let copy = settings.shortcut(for: .copyAndClose)

        register(id: .toggle, keyCode: toggle.keyCode, modifiers: toggle.carbonModifiers)
        register(id: .copy, keyCode: copy.keyCode, modifiers: copy.carbonModifiers)
    }

    private func register(id: Shortcut, keyCode: UInt32, modifiers: UInt32) {
        let hotKeyID = EventHotKeyID(signature: fourCharCode("QSKT"), id: id.rawValue)
        var hotKeyRef: EventHotKeyRef?
        RegisterEventHotKey(
            keyCode,
            modifiers,
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )
        hotKeyRefs.append(hotKeyRef)
    }

    func reloadShortcuts() {
        registerHotkeys()
    }

    private func unregisterHotkeys() {
        for hotKeyRef in hotKeyRefs {
            if let hotKeyRef {
                UnregisterEventHotKey(hotKeyRef)
            }
        }
        hotKeyRefs.removeAll()
    }

    private func installHandler() {
        var eventType = EventTypeSpec(
            eventClass: OSType(kEventClassKeyboard),
            eventKind: UInt32(kEventHotKeyPressed)
        )

        let callback: EventHandlerUPP = { _, event, userData in
            guard let userData else { return noErr }

            let manager = Unmanaged<HotkeyManager>
                .fromOpaque(userData)
                .takeUnretainedValue()

            var hotKeyID = EventHotKeyID()
            GetEventParameter(
                event,
                EventParamName(kEventParamDirectObject),
                EventParamType(typeEventHotKeyID),
                nil,
                MemoryLayout<EventHotKeyID>.size,
                nil,
                &hotKeyID
            )

            manager.handleHotkey(id: hotKeyID.id)
            return noErr
        }

        InstallEventHandler(
            GetApplicationEventTarget(),
            callback,
            1,
            &eventType,
            Unmanaged.passUnretained(self).toOpaque(),
            &eventHandlerRef
        )
    }

    private func handleHotkey(id: UInt32) {
        guard let shortcut = Shortcut(rawValue: id) else { return }
        let toggleHandler = self.toggleHandler
        let copyHandler = self.copyHandler

        Task { @MainActor in
            switch shortcut {
            case .toggle:
                toggleHandler()
            case .copy:
                copyHandler()
            }
        }
    }
}

private func fourCharCode(_ string: String) -> OSType {
    string.utf8.reduce(0) { value, character in
        (value << 8) + OSType(character)
    }
}
