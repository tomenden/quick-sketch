import AppKit
import Observation
import SwiftUI

@MainActor
final class WindowCoordinator {
    private weak var window: NSWindow?

    func attach(window: NSWindow?) {
        guard let window else { return }
        self.window = window
        window.title = "Quick Sketch"
        window.isReleasedWhenClosed = false
        window.level = .normal
        window.collectionBehavior = [.fullScreenAuxiliary]
        window.titlebarAppearsTransparent = false
        window.isMovableByWindowBackground = false
    }

    func toggleWindow() {
        guard let window else { return }

        if window.isVisible {
            hideWindow()
        } else {
            showWindow()
        }
    }

    func showWindow() {
        guard let window else { return }
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
        window.orderFrontRegardless()
    }

    func hideWindow() {
        window?.orderOut(nil)
    }
}

struct WindowAccessor: NSViewRepresentable {
    let onResolve: (NSWindow?) -> Void

    func makeNSView(context: Context) -> NSView {
        let view = NSView()
        DispatchQueue.main.async {
            onResolve(view.window)
        }
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        DispatchQueue.main.async {
            onResolve(nsView.window)
        }
    }
}

struct SketchRootView: View {
    @Bindable var sketchStore: SketchStore
    @Bindable var settingsStore: ShortcutSettingsStore
    let copyAndClose: () -> Bool

    var body: some View {
        GeometryReader { geometry in
            let compact = geometry.size.width < 1160
            let canvasMinHeight = max(420, geometry.size.height - (compact ? 170 : 150))

            ScrollView {
                VStack(spacing: 20) {
                    headerPanel(compact: compact)
                    SketchCanvasView(sketchStore: sketchStore)
                        .frame(maxWidth: .infinity, minHeight: canvasMinHeight)
                }
                .frame(maxWidth: .infinity, alignment: .top)
                .padding(24)
            }
        }
        .background(
            LinearGradient(
                colors: [
                    Color(red: 0.97, green: 0.98, blue: 0.995),
                    Color(red: 0.91, green: 0.94, blue: 0.98),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
    }

    private func headerPanel(compact: Bool) -> some View {
        VStack(spacing: 16) {
            overviewSection
            actionCluster(compact: compact)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(
            RoundedRectangle(cornerRadius: 24)
                .fill(Color.white.opacity(0.82))
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(Color.white.opacity(0.95), lineWidth: 1)
                )
                .shadow(color: .black.opacity(0.07), radius: 18, y: 6)
        )
    }

    private var overviewSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Quick Sketch", systemImage: "scribble.variable")
                .font(.title.bold())
                .foregroundStyle(Color(red: 0.08, green: 0.11, blue: 0.16))

            Text("Fast scratchpad for visual thinking while you chat, code, or explain.")
                .font(.callout)
                .foregroundStyle(Color(red: 0.34, green: 0.39, blue: 0.47))

            Text(shortcutSummary)
                .font(.caption.monospaced())
                .foregroundStyle(Color(red: 0.40, green: 0.46, blue: 0.54))
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func actionCluster(compact: Bool) -> some View {
        Group {
            if compact {
                VStack(spacing: 12) {
                    ScrollView(.horizontal, showsIndicators: false) {
                        controlRow
                            .padding(.vertical, 2)
                    }

                    exportButtonsRow
                }
            } else {
                wideControlGrid
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(
            RoundedRectangle(cornerRadius: 20)
                .fill(.ultraThinMaterial)
        )
    }

    private var wideControlGrid: some View {
        HStack(alignment: .top, spacing: 20) {
            wideSection(title: "Tool", width: 185) {
                toolControls
            }

            wideSection(title: "Stroke", width: 145) {
                strokeControls
            }

            wideSection(title: "History", width: 240) {
                historyControls
            }

            wideSection(title: "Actions") {
                actionButtons
            }
        }
    }

    private func wideSection<Content: View>(title: String, width: CGFloat? = nil, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionTitle(title)
            content()
        }
        .frame(width: width, alignment: .leading)
    }

    private var controlRow: some View {
        HStack(alignment: .center, spacing: 14) {
            toolSection
            Divider().frame(height: 40)
            strokeSection
            Divider().frame(height: 40)
            historySection
        }
    }

    private func sectionTitle(_ title: String) -> some View {
        Text(title)
            .font(.caption.bold())
            .foregroundStyle(.secondary)
    }

    private var toolSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionTitle("Tool")
            toolControls
        }
        .frame(width: 185, alignment: .leading)
    }

    private var toolControls: some View {
        VStack(alignment: .leading, spacing: 8) {
            Menu {
                Picker("Tool", selection: $sketchStore.toolMode) {
                    ForEach(ToolMode.allCases) { mode in
                        Label(mode.title, systemImage: mode.systemImage).tag(mode)
                    }
                }
            } label: {
                Label(sketchStore.toolMode.title, systemImage: sketchStore.toolMode.systemImage)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.primary)
                    .frame(width: 160, alignment: .leading)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(Color.white.opacity(0.95))
                    )
            }
            .menuStyle(.borderlessButton)

            HStack(spacing: 10) {
                if sketchStore.toolMode == .text {
                    TextField("Text", text: $sketchStore.draftText)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 160)
                } else if sketchStore.toolMode == .select, sketchStore.selectedTextElement != nil {
                    TextField(
                        "Selected text",
                        text: Binding(
                            get: { sketchStore.selectedTextElement?.text ?? "" },
                            set: { sketchStore.updateSelectedText($0) }
                        )
                    )
                    .textFieldStyle(.roundedBorder)
                    .frame(width: 180)
                } else {
                    ColorPicker(
                        "Ink",
                        selection: Binding(
                            get: { Color(nsColor: sketchStore.selectedColor) },
                            set: { sketchStore.selectedColor = NSColor($0) }
                        ),
                        supportsOpacity: false
                    )
                    .labelsHidden()
                    .disabled(sketchStore.toolMode == .eraser)

                    Text(toolDetailText)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .frame(width: 185, alignment: .leading)
    }

    private var strokeSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionTitle(strokeSectionTitle)
            strokeControls
        }
        .frame(width: 145, alignment: .leading)
    }

    private var strokeControls: some View {
        VStack(alignment: .leading, spacing: 8) {
            Slider(
                value: Binding(
                    get: { strokeControlValue },
                    set: {
                        if sketchStore.toolMode == .text {
                            sketchStore.fontSize = $0
                        } else if sketchStore.toolMode == .select, sketchStore.selectedTextElement != nil {
                            sketchStore.updateSelectedTextFontSize($0)
                        } else {
                            sketchStore.lineWidth = $0
                        }
                    }
                ),
                in: strokeControlRange
            )
            .frame(width: 130)

            Text("\(Int(strokeControlValue.rounded())) pt")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(width: 145, alignment: .leading)
    }

    private var historySection: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionTitle("History")
            historyControls
        }
        .frame(width: 240, alignment: .leading)
    }

    private var historyControls: some View {
        HStack(spacing: 10) {
            Button(action: sketchStore.undo) {
                actionLabel("Undo", systemImage: "arrow.uturn.backward", foreground: .black)
            }
            .buttonStyle(.plain)
            .background(CapsuleButtonBackground(fill: Color.white.opacity(sketchStore.canUndo ? 1 : 0.65)))
            .disabled(!sketchStore.canUndo)

            Button(action: sketchStore.redo) {
                actionLabel("Redo", systemImage: "arrow.uturn.forward", foreground: .black)
            }
            .buttonStyle(.plain)
            .background(CapsuleButtonBackground(fill: Color.white.opacity(sketchStore.canRedo ? 1 : 0.65)))
            .disabled(!sketchStore.canRedo)
        }
        .frame(width: 240, alignment: .leading)
    }

    private var exportButtonsRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionTitle("Actions")
            actionButtons
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var actionButtons: some View {
        HStack(spacing: 10) {
            if sketchStore.selectedElement != nil {
                Button(action: sketchStore.deleteSelection) {
                    actionLabel("Delete", systemImage: "trash.slash", foreground: .black)
                }
                .buttonStyle(.plain)
                .background(CapsuleButtonBackground(fill: Color.white))
            }

            Button(action: sketchStore.clear) {
                actionLabel("Clear", systemImage: "trash", foreground: .black)
            }
            .buttonStyle(.plain)
            .background(CapsuleButtonBackground(fill: Color.white))
            .keyboardShortcut("k", modifiers: [.command])

            Button(action: copyImage) {
                actionLabel("Copy Image", systemImage: "doc.on.doc", foreground: .black)
            }
            .buttonStyle(.plain)
            .background(CapsuleButtonBackground(fill: Color.white))

            Button(action: {
                _ = copyAndClose()
            }) {
                actionLabel("Copy & Close", systemImage: "paperplane.fill", foreground: .white)
            }
            .buttonStyle(.plain)
            .background(
                CapsuleButtonBackground(
                    fill: Color(red: 0.17, green: 0.39, blue: 0.84),
                    borderColor: Color(red: 0.10, green: 0.25, blue: 0.60)
                )
            )
        }
    }

    private func copyImage() {
        if !ClipboardService.copySketch(from: sketchStore) {
            NSSound.beep()
        }
    }

    private var shortcutSummary: String {
        "Toggle \(settingsStore.shortcut(for: .toggleWindow).displayText)   Copy \(settingsStore.shortcut(for: .copyAndClose).displayText)"
    }

    private var toolDetailText: String {
        switch sketchStore.toolMode {
        case .select:
            sketchStore.selectedTextElement == nil ? "Select or drag items" : "Editing selected text"
        case .pen:
            "Ink"
        case .eraser:
            "Eraser"
        case .rectangle, .ellipse, .arrow:
            "Stroke"
        case .text:
            "Text"
        }
    }

    private var strokeSectionTitle: String {
        if sketchStore.toolMode == .text || (sketchStore.toolMode == .select && sketchStore.selectedTextElement != nil) {
            return "Text Size"
        }

        return "Stroke"
    }

    private var strokeControlValue: CGFloat {
        if sketchStore.toolMode == .text {
            return sketchStore.fontSize
        }

        if let selectedText = sketchStore.selectedTextElement, sketchStore.toolMode == .select {
            return selectedText.fontSize
        }

        return sketchStore.lineWidth
    }

    private var strokeControlRange: ClosedRange<CGFloat> {
        if sketchStore.toolMode == .text || (sketchStore.toolMode == .select && sketchStore.selectedTextElement != nil) {
            return 14...48
        }

        return 1...18
    }

    private func actionLabel(_ title: String, systemImage: String, foreground: Color) -> some View {
        Label(title, systemImage: systemImage)
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(foreground)
            .labelStyle(.titleAndIcon)
            .lineLimit(1)
            .fixedSize(horizontal: true, vertical: false)
            .frame(minWidth: 94, minHeight: 34, alignment: .leading)
            .padding(.horizontal, 12)
            .contentShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct CapsuleButtonBackground: View {
    var fill: Color
    var borderColor = Color.black.opacity(0.12)

    var body: some View {
        RoundedRectangle(cornerRadius: 12, style: .continuous)
            .fill(fill)
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .stroke(borderColor, lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.05), radius: 6, y: 2)
    }
}
