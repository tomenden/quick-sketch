import AppKit
import Foundation
import Observation
import SwiftUI

struct StrokePoint: Codable, Hashable {
    var x: Double
    var y: Double

    init(_ point: CGPoint) {
        x = point.x
        y = point.y
    }

    var cgPoint: CGPoint {
        CGPoint(x: x, y: y)
    }
}

struct SketchStroke: Identifiable, Hashable {
    var id = UUID()
    var points: [StrokePoint]
    var colorData: Data
    var lineWidth: Double

    init(points: [CGPoint], color: NSColor, lineWidth: CGFloat) {
        self.points = points.map(StrokePoint.init)
        self.colorData = (try? NSKeyedArchiver.archivedData(
            withRootObject: color,
            requiringSecureCoding: false
        )) ?? Data()
        self.lineWidth = lineWidth
    }

    var color: NSColor {
        guard
            let color = try? NSKeyedUnarchiver.unarchivedObject(ofClass: NSColor.self, from: colorData)
        else {
            return .labelColor
        }

        return color
    }
}

enum ShapeKind: String, CaseIterable, Identifiable {
    case rectangle
    case ellipse
    case arrow

    var id: String { rawValue }

    var title: String {
        switch self {
        case .rectangle:
            "Rectangle"
        case .ellipse:
            "Circle"
        case .arrow:
            "Arrow"
        }
    }
}

struct SketchShape: Identifiable, Hashable {
    var id = UUID()
    var kind: ShapeKind
    var start: StrokePoint
    var end: StrokePoint
    var colorData: Data
    var lineWidth: Double

    init(kind: ShapeKind, start: CGPoint, end: CGPoint, color: NSColor, lineWidth: CGFloat) {
        self.kind = kind
        self.start = StrokePoint(start)
        self.end = StrokePoint(end)
        self.colorData = (try? NSKeyedArchiver.archivedData(
            withRootObject: color,
            requiringSecureCoding: false
        )) ?? Data()
        self.lineWidth = lineWidth
    }

    var color: NSColor {
        guard
            let color = try? NSKeyedUnarchiver.unarchivedObject(ofClass: NSColor.self, from: colorData)
        else {
            return .labelColor
        }

        return color
    }

    var rect: CGRect {
        CGRect(
            x: min(start.x, end.x),
            y: min(start.y, end.y),
            width: abs(end.x - start.x),
            height: abs(end.y - start.y)
        )
    }
}

struct SketchText: Identifiable, Hashable {
    var id = UUID()
    var origin: StrokePoint
    var text: String
    var colorData: Data
    var fontSize: Double

    init(origin: CGPoint, text: String, color: NSColor, fontSize: CGFloat) {
        self.origin = StrokePoint(origin)
        self.text = text
        self.colorData = (try? NSKeyedArchiver.archivedData(
            withRootObject: color,
            requiringSecureCoding: false
        )) ?? Data()
        self.fontSize = fontSize
    }

    var color: NSColor {
        guard
            let color = try? NSKeyedUnarchiver.unarchivedObject(ofClass: NSColor.self, from: colorData)
        else {
            return .labelColor
        }

        return color
    }
}

enum SketchElement: Identifiable, Hashable {
    case stroke(SketchStroke)
    case shape(SketchShape)
    case text(SketchText)

    var id: UUID {
        switch self {
        case .stroke(let stroke):
            stroke.id
        case .shape(let shape):
            shape.id
        case .text(let text):
            text.id
        }
    }
}

enum ToolMode: String, CaseIterable, Identifiable {
    case select
    case pen
    case eraser
    case rectangle
    case ellipse
    case arrow
    case text

    var id: String { rawValue }

    var title: String {
        switch self {
        case .select:
            "Select"
        case .pen:
            "Pen"
        case .eraser:
            "Eraser"
        case .rectangle:
            "Rectangle"
        case .ellipse:
            "Circle"
        case .arrow:
            "Arrow"
        case .text:
            "Text"
        }
    }

    var systemImage: String {
        switch self {
        case .select:
            "cursorarrow"
        case .pen:
            "pencil.tip"
        case .eraser:
            "eraser"
        case .rectangle:
            "rectangle"
        case .ellipse:
            "circle"
        case .arrow:
            "arrow.up.right"
        case .text:
            "textformat"
        }
    }
}

enum SelectionHandle {
    case resizeBottomRight
}

private enum InteractionState {
    case moving(id: UUID, initialElement: SketchElement, startPoint: CGPoint)
    case resizingShape(id: UUID, initialShape: SketchShape)
}

enum SketchGeometry {
    static func bounds(for element: SketchElement) -> CGRect {
        switch element {
        case .stroke(let stroke):
            strokeBounds(for: stroke)
        case .shape(let shape):
            shapeBounds(for: shape)
        case .text(let text):
            textBounds(for: text)
        }
    }

    static func strokeBounds(for stroke: SketchStroke) -> CGRect {
        guard let first = stroke.points.first?.cgPoint else { return .null }

        var minX = first.x
        var maxX = first.x
        var minY = first.y
        var maxY = first.y

        for point in stroke.points.dropFirst() {
            let cgPoint = point.cgPoint
            minX = min(minX, cgPoint.x)
            maxX = max(maxX, cgPoint.x)
            minY = min(minY, cgPoint.y)
            maxY = max(maxY, cgPoint.y)
        }

        let inset = stroke.lineWidth / 2
        return CGRect(
            x: minX - inset,
            y: minY - inset,
            width: max(maxX - minX, stroke.lineWidth) + inset * 2,
            height: max(maxY - minY, stroke.lineWidth) + inset * 2
        )
    }

    static func shapeBounds(for shape: SketchShape) -> CGRect {
        switch shape.kind {
        case .rectangle, .ellipse:
            return shape.rect.insetBy(dx: -shape.lineWidth / 2, dy: -shape.lineWidth / 2)
        case .arrow:
            let start = shape.start.cgPoint
            let end = shape.end.cgPoint
            let minX = min(start.x, end.x)
            let minY = min(start.y, end.y)
            let maxX = max(start.x, end.x)
            let maxY = max(start.y, end.y)
            let padding = max(shape.lineWidth * 2, 18)
            return CGRect(x: minX - padding, y: minY - padding, width: (maxX - minX) + padding * 2, height: (maxY - minY) + padding * 2)
        }
    }

    static func textBounds(for text: SketchText) -> CGRect {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: text.fontSize, weight: .semibold),
        ]
        let size = (text.text as NSString).size(withAttributes: attributes)
        return CGRect(origin: text.origin.cgPoint, size: size)
    }

    static func resizeHandleRect(for bounds: CGRect) -> CGRect {
        CGRect(x: bounds.maxX - 7, y: bounds.maxY - 7, width: 14, height: 14)
    }
}

@Observable
final class SketchStore {
    var elements: [SketchElement] = []
    var activeElement: SketchElement?
    var selectedElementID: UUID?
    var selectedColor: NSColor = .black
    var lineWidth: CGFloat = 4
    var fontSize: CGFloat = 28
    var canvasSize = CGSize(width: 960, height: 640)
    var toolMode: ToolMode = .pen
    var redoElements: [SketchElement] = []
    var draftText = "Label"

    private var interactionState: InteractionState?

    var isInteractionActive: Bool {
        activeElement != nil || interactionState != nil
    }

    var hasContent: Bool {
        !elements.isEmpty || activeElement != nil
    }

    var canUndo: Bool {
        !elements.isEmpty
    }

    var canRedo: Bool {
        !redoElements.isEmpty
    }

    var selectedElement: SketchElement? {
        guard let selectedElementID else { return nil }
        return elements.first(where: { $0.id == selectedElementID })
    }

    var selectedTextElement: SketchText? {
        guard case .text(let text)? = selectedElement else { return nil }
        return text
    }

    var canResizeSelection: Bool {
        if case .shape? = selectedElement { return true }
        return false
    }

    func beginInteraction(at point: CGPoint) {
        switch toolMode {
        case .select:
            beginSelectionInteraction(at: point)
        case .pen, .eraser:
            activeElement = .stroke(
                SketchStroke(
                    points: [point],
                    color: currentDrawingColor,
                    lineWidth: lineWidth
                )
            )
        case .rectangle, .ellipse, .arrow:
            let kind: ShapeKind = switch toolMode {
            case .rectangle: .rectangle
            case .ellipse: .ellipse
            case .arrow: .arrow
            default: .rectangle
            }
            activeElement = .shape(
                SketchShape(
                    kind: kind,
                    start: point,
                    end: point,
                    color: currentDrawingColor,
                    lineWidth: lineWidth
                )
            )
        case .text:
            placeText(at: point)
        }
    }

    func updateInteraction(to point: CGPoint) {
        if let interactionState {
            updateSelectionInteraction(interactionState, to: point)
            return
        }

        guard let activeElement else { return }

        switch activeElement {
        case .stroke(var stroke):
            stroke.points.append(StrokePoint(point))
            self.activeElement = .stroke(stroke)
        case .shape(var shape):
            shape.end = StrokePoint(point)
            self.activeElement = .shape(shape)
        case .text:
            break
        }
    }

    func endInteraction() {
        if interactionState != nil {
            interactionState = nil
            redoElements.removeAll()
            return
        }

        guard let activeElement else { return }
        elements.append(activeElement)
        self.activeElement = nil
        selectedElementID = activeElement.id
        redoElements.removeAll()
    }

    func clear() {
        elements.removeAll()
        activeElement = nil
        selectedElementID = nil
        redoElements.removeAll()
    }

    func deleteSelection() {
        guard let selectedElementID else { return }
        elements.removeAll(where: { $0.id == selectedElementID })
        self.selectedElementID = nil
        redoElements.removeAll()
    }

    func updateSelectedText(_ value: String) {
        guard let selectedElementID else { return }
        replaceElement(id: selectedElementID) { element in
            guard case .text(var text) = element else { return element }
            text.text = value
            return .text(text)
        }
        redoElements.removeAll()
    }

    func updateSelectedTextFontSize(_ value: CGFloat) {
        guard let selectedElementID else { return }
        replaceElement(id: selectedElementID) { element in
            guard case .text(var text) = element else { return element }
            text.fontSize = value
            return .text(text)
        }
        redoElements.removeAll()
    }

    func undo() {
        guard let element = elements.popLast() else { return }
        activeElement = nil
        if selectedElementID == element.id {
            selectedElementID = nil
        }
        redoElements.append(element)
    }

    func redo() {
        guard let element = redoElements.popLast() else { return }
        activeElement = nil
        elements.append(element)
        selectedElementID = element.id
    }

    private func beginSelectionInteraction(at point: CGPoint) {
        if
            let selectedElement,
            canResizeSelection,
            SketchGeometry.resizeHandleRect(for: SketchGeometry.bounds(for: selectedElement)).contains(point),
            case .shape(let shape) = selectedElement
        {
            interactionState = .resizingShape(id: shape.id, initialShape: shape)
            return
        }

        guard let hitElement = topmostElement(at: point) else {
            selectedElementID = nil
            interactionState = nil
            return
        }

        selectedElementID = hitElement.id
        interactionState = .moving(id: hitElement.id, initialElement: hitElement, startPoint: point)
    }

    private func updateSelectionInteraction(_ state: InteractionState, to point: CGPoint) {
        switch state {
        case .moving(let id, let initialElement, let startPoint):
            let dx = point.x - startPoint.x
            let dy = point.y - startPoint.y
            replaceElement(id: id) { _ in move(element: initialElement, dx: dx, dy: dy) }
        case .resizingShape(let id, let initialShape):
            var resized = initialShape
            resized.end = StrokePoint(point)
            replaceElement(id: id) { _ in .shape(resized) }
        }
    }

    private func topmostElement(at point: CGPoint) -> SketchElement? {
        elements.reversed().first { element in
            let hitBounds = SketchGeometry.bounds(for: element).insetBy(dx: -8, dy: -8)
            return hitBounds.contains(point)
        }
    }

    private func move(element: SketchElement, dx: CGFloat, dy: CGFloat) -> SketchElement {
        switch element {
        case .stroke(var stroke):
            stroke.points = stroke.points.map { point in
                StrokePoint(CGPoint(x: point.x + dx, y: point.y + dy))
            }
            return .stroke(stroke)
        case .shape(var shape):
            shape.start = StrokePoint(CGPoint(x: shape.start.x + dx, y: shape.start.y + dy))
            shape.end = StrokePoint(CGPoint(x: shape.end.x + dx, y: shape.end.y + dy))
            return .shape(shape)
        case .text(var text):
            text.origin = StrokePoint(CGPoint(x: text.origin.x + dx, y: text.origin.y + dy))
            return .text(text)
        }
    }

    private func replaceElement(id: UUID, transform: (SketchElement) -> SketchElement) {
        guard let index = elements.firstIndex(where: { $0.id == id }) else { return }
        elements[index] = transform(elements[index])
    }

    private func placeText(at point: CGPoint) {
        let trimmed = draftText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            NSSound.beep()
            return
        }

        let text = SketchText(
            origin: point,
            text: trimmed,
            color: selectedColor,
            fontSize: fontSize
        )
        let element = SketchElement.text(text)
        elements.append(element)
        selectedElementID = element.id
        redoElements.removeAll()
    }

    private var currentDrawingColor: NSColor {
        switch toolMode {
        case .eraser:
            .white
        default:
            selectedColor
        }
    }
}
