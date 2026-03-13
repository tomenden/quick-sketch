import Carbon
import Foundation
import Observation

enum ShortcutAction: String, CaseIterable, Identifiable {
    case toggleWindow
    case copyAndClose

    var id: String { rawValue }

    var title: String {
        switch self {
        case .toggleWindow:
            "Toggle Window"
        case .copyAndClose:
            "Copy and Close"
        }
    }
}

enum ModifierPreset: String, CaseIterable, Identifiable {
    case controlShift
    case commandShift
    case optionShift
    case commandOption

    var id: String { rawValue }

    var title: String {
        switch self {
        case .controlShift:
            "Control + Shift"
        case .commandShift:
            "Command + Shift"
        case .optionShift:
            "Option + Shift"
        case .commandOption:
            "Command + Option"
        }
    }

    var carbonFlags: UInt32 {
        switch self {
        case .controlShift:
            UInt32(controlKey) | UInt32(shiftKey)
        case .commandShift:
            UInt32(cmdKey) | UInt32(shiftKey)
        case .optionShift:
            UInt32(optionKey) | UInt32(shiftKey)
        case .commandOption:
            UInt32(cmdKey) | UInt32(optionKey)
        }
    }
}

enum ShortcutKey: String, CaseIterable, Identifiable {
    case space
    case `return`
    case s
    case d
    case k
    case p
    case slash

    var id: String { rawValue }

    var title: String {
        switch self {
        case .space:
            "Space"
        case .return:
            "Return"
        case .s:
            "S"
        case .d:
            "D"
        case .k:
            "K"
        case .p:
            "P"
        case .slash:
            "Slash"
        }
    }

    var keyCode: UInt32 {
        switch self {
        case .space:
            UInt32(kVK_Space)
        case .return:
            UInt32(kVK_Return)
        case .s:
            UInt32(kVK_ANSI_S)
        case .d:
            UInt32(kVK_ANSI_D)
        case .k:
            UInt32(kVK_ANSI_K)
        case .p:
            UInt32(kVK_ANSI_P)
        case .slash:
            UInt32(kVK_ANSI_Slash)
        }
    }
}

struct HotkeyShortcut: Equatable {
    var key: ShortcutKey
    var modifiers: ModifierPreset

    var keyCode: UInt32 { key.keyCode }
    var carbonModifiers: UInt32 { modifiers.carbonFlags }
    var displayText: String { "\(modifiers.title) + \(key.title)" }
}

@Observable
final class ShortcutSettingsStore {
    private enum Keys {
        static let toggleKey = "shortcut.toggle.key"
        static let toggleModifiers = "shortcut.toggle.modifiers"
        static let copyKey = "shortcut.copy.key"
        static let copyModifiers = "shortcut.copy.modifiers"
        static let autoClearAfterCopyAndClose = "copy.autoClearAfterCopyAndClose"
    }

    var toggleKey: ShortcutKey {
        didSet { persist() }
    }

    var toggleModifiers: ModifierPreset {
        didSet { persist() }
    }

    var copyKey: ShortcutKey {
        didSet { persist() }
    }

    var copyModifiers: ModifierPreset {
        didSet { persist() }
    }

    var autoClearAfterCopyAndClose: Bool {
        didSet { persist() }
    }

    var onChange: (() -> Void)?

    init(defaults: UserDefaults = .standard) {
        toggleKey = Self.readKey(defaults, key: Keys.toggleKey, fallback: .space)
        toggleModifiers = Self.readModifiers(defaults, key: Keys.toggleModifiers, fallback: .controlShift)
        copyKey = Self.readKey(defaults, key: Keys.copyKey, fallback: .return)
        copyModifiers = Self.readModifiers(defaults, key: Keys.copyModifiers, fallback: .controlShift)
        autoClearAfterCopyAndClose = defaults.object(forKey: Keys.autoClearAfterCopyAndClose) as? Bool ?? true
    }

    func shortcut(for action: ShortcutAction) -> HotkeyShortcut {
        switch action {
        case .toggleWindow:
            HotkeyShortcut(key: toggleKey, modifiers: toggleModifiers)
        case .copyAndClose:
            HotkeyShortcut(key: copyKey, modifiers: copyModifiers)
        }
    }

    func setShortcut(_ shortcut: HotkeyShortcut, for action: ShortcutAction) {
        switch action {
        case .toggleWindow:
            toggleKey = shortcut.key
            toggleModifiers = shortcut.modifiers
        case .copyAndClose:
            copyKey = shortcut.key
            copyModifiers = shortcut.modifiers
        }
    }

    func conflictingAction(for action: ShortcutAction, shortcut: HotkeyShortcut) -> ShortcutAction? {
        ShortcutAction.allCases.first { candidate in
            candidate != action && self.shortcut(for: candidate) == shortcut
        }
    }

    private func persist() {
        let defaults = UserDefaults.standard
        defaults.set(toggleKey.rawValue, forKey: Keys.toggleKey)
        defaults.set(toggleModifiers.rawValue, forKey: Keys.toggleModifiers)
        defaults.set(copyKey.rawValue, forKey: Keys.copyKey)
        defaults.set(copyModifiers.rawValue, forKey: Keys.copyModifiers)
        defaults.set(autoClearAfterCopyAndClose, forKey: Keys.autoClearAfterCopyAndClose)
        onChange?()
    }

    private static func readKey(_ defaults: UserDefaults, key: String, fallback: ShortcutKey) -> ShortcutKey {
        guard let rawValue = defaults.string(forKey: key), let stored = ShortcutKey(rawValue: rawValue) else {
            return fallback
        }
        return stored
    }

    private static func readModifiers(_ defaults: UserDefaults, key: String, fallback: ModifierPreset) -> ModifierPreset {
        guard let rawValue = defaults.string(forKey: key), let stored = ModifierPreset(rawValue: rawValue) else {
            return fallback
        }
        return stored
    }
}
