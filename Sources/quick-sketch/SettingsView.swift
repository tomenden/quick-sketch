import SwiftUI

struct SettingsView: View {
    @State private var settingsStore = AppController.shared.shortcutSettings
    @State private var shortcutConflictMessage: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Quick Sketch")
                .font(.title2.weight(.semibold))
            Text("Configure global shortcuts.")
                .foregroundStyle(.secondary)

            ShortcutPickerView(
                title: "Toggle Window",
                key: settingsStore.toggleKey,
                modifiers: settingsStore.toggleModifiers,
                onKeyChange: { updateShortcut(.toggleWindow, key: $0, modifiers: settingsStore.toggleModifiers) },
                onModifierChange: { updateShortcut(.toggleWindow, key: settingsStore.toggleKey, modifiers: $0) }
            )

            ShortcutPickerView(
                title: "Copy and Close",
                key: settingsStore.copyKey,
                modifiers: settingsStore.copyModifiers,
                onKeyChange: { updateShortcut(.copyAndClose, key: $0, modifiers: settingsStore.copyModifiers) },
                onModifierChange: { updateShortcut(.copyAndClose, key: settingsStore.copyKey, modifiers: $0) }
            )

            if let shortcutConflictMessage {
                Text(shortcutConflictMessage)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.red)
            }

            Toggle("Auto-clear canvas after Copy & Close", isOn: $settingsStore.autoClearAfterCopyAndClose)
                .padding(.top, 6)
        }
        .padding(24)
        .frame(width: 460)
    }

    private func updateShortcut(_ action: ShortcutAction, key: ShortcutKey, modifiers: ModifierPreset) {
        let shortcut = HotkeyShortcut(key: key, modifiers: modifiers)

        if let conflictingAction = settingsStore.conflictingAction(for: action, shortcut: shortcut) {
            shortcutConflictMessage = "\(action.title) conflicts with \(conflictingAction.title). Choose a different shortcut."
            NSSound.beep()
            return
        }

        shortcutConflictMessage = nil
        settingsStore.setShortcut(shortcut, for: action)
    }
}
