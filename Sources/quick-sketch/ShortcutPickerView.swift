import SwiftUI

@MainActor
struct ShortcutPickerView: View {
    let title: String
    let key: ShortcutKey
    let modifiers: ModifierPreset
    let onKeyChange: (ShortcutKey) -> Void
    let onModifierChange: (ModifierPreset) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.headline)

            HStack {
                Picker(
                    "Modifiers",
                    selection: Binding(
                        get: { modifiers },
                        set: onModifierChange
                    )
                ) {
                    ForEach(ModifierPreset.allCases) { preset in
                        Text(preset.title).tag(preset)
                    }
                }

                Picker(
                    "Key",
                    selection: Binding(
                        get: { key },
                        set: onKeyChange
                    )
                ) {
                    ForEach(ShortcutKey.allCases) { shortcutKey in
                        Text(shortcutKey.title).tag(shortcutKey)
                    }
                }
                .frame(width: 120)
            }
        }
    }
}
