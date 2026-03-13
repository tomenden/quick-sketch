import AppKit
import Observation
import SwiftUI

struct SketchCanvasView: View {
    @Bindable var sketchStore: SketchStore
    @State private var placedTextInCurrentGesture = false

    var body: some View {
        GeometryReader { geometry in
            ZStack {
                RoundedRectangle(cornerRadius: 20)
                    .fill(Color.white)
                    .shadow(color: .black.opacity(0.14), radius: 24, y: 12)

                Canvas { context, _ in
                    for element in sketchStore.elements {
                        draw(element, in: &context)
                    }

                    if let activeElement = sketchStore.activeElement {
                        draw(activeElement, in: &context)
                    }
                }
                .clipShape(RoundedRectangle(cornerRadius: 20))
                .contentShape(RoundedRectangle(cornerRadius: 20))
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            let point = clamped(point: value.location, in: geometry.size)

                            if sketchStore.toolMode == .text {
                                guard !placedTextInCurrentGesture else { return }
                                sketchStore.beginInteraction(at: point)
                                placedTextInCurrentGesture = true
                            } else if !sketchStore.isInteractionActive {
                                sketchStore.beginInteraction(at: point)
                            } else {
                                sketchStore.updateInteraction(to: point)
                            }
                        }
                        .onEnded { _ in
                            sketchStore.endInteraction()
                            placedTextInCurrentGesture = false
                        }
                )
                .onAppear {
                    sketchStore.canvasSize = geometry.size
                }
                .onChange(of: geometry.size) { _, newSize in
                    sketchStore.canvasSize = newSize
                }

                if sketchStore.toolMode == .select, let selectedElement = sketchStore.selectedElement {
                    SelectionOverlay(
                        bounds: SketchGeometry.bounds(for: selectedElement),
                        showsResizeHandle: sketchStore.canResizeSelection
                    )
                    .allowsHitTesting(false)
                }

                if !sketchStore.hasContent {
                    ContentUnavailableView {
                        Label("Start Diagramming", systemImage: sketchStore.toolMode.systemImage)
                    } description: {
                        Text("Use select, pen, text, boxes, circles, and arrows to sketch ideas, then copy the result to your clipboard.")
                    }
                    .foregroundStyle(.secondary)
                    .padding(40)
                    .allowsHitTesting(false)
                }
            }
        }
    }

    private func draw(_ element: SketchElement, in context: inout GraphicsContext) {
        switch element {
        case .stroke(let stroke):
            drawStroke(stroke, in: &context)
        case .shape(let shape):
            drawShape(shape, in: &context)
        case .text(let text):
            drawText(text, in: &context)
        }
    }

    private func drawStroke(_ stroke: SketchStroke, in context: inout GraphicsContext) {
        guard let firstPoint = stroke.points.first?.cgPoint else { return }

        var path = Path()
        path.move(to: firstPoint)

        for point in stroke.points.dropFirst() {
            path.addLine(to: point.cgPoint)
        }

        if stroke.points.count == 1 {
            path.addEllipse(
                in: CGRect(
                    x: firstPoint.x - stroke.lineWidth / 2,
                    y: firstPoint.y - stroke.lineWidth / 2,
                    width: stroke.lineWidth,
                    height: stroke.lineWidth
                )
            )
        }

        context.stroke(
            path,
            with: .color(Color(nsColor: stroke.color)),
            style: StrokeStyle(
                lineWidth: stroke.lineWidth,
                lineCap: .round,
                lineJoin: .round
            )
        )
    }

    private func drawShape(_ shape: SketchShape, in context: inout GraphicsContext) {
        let color = Color(nsColor: shape.color)
        let strokeStyle = StrokeStyle(lineWidth: shape.lineWidth, lineCap: .round, lineJoin: .round)

        switch shape.kind {
        case .rectangle:
            context.stroke(Path(shape.rect), with: .color(color), style: strokeStyle)
        case .ellipse:
            context.stroke(Path(ellipseIn: shape.rect), with: .color(color), style: strokeStyle)
        case .arrow:
            context.stroke(arrowPath(for: shape), with: .color(color), style: strokeStyle)
        }
    }

    private func drawText(_ text: SketchText, in context: inout GraphicsContext) {
        let attributedString = AttributedString(
            text.text,
            attributes: AttributeContainer()
                .foregroundColor(Color(nsColor: text.color))
                .font(.system(size: text.fontSize, weight: .semibold, design: .rounded))
        )

        context.draw(Text(attributedString), at: text.origin.cgPoint, anchor: .topLeading)
    }

    private func arrowPath(for shape: SketchShape) -> Path {
        let start = shape.start.cgPoint
        let end = shape.end.cgPoint
        let angle = atan2(end.y - start.y, end.x - start.x)
        let arrowHeadLength = max(14, shape.lineWidth * 3.5)
        let arrowHeadAngle = CGFloat.pi / 7

        var path = Path()
        path.move(to: start)
        path.addLine(to: end)

        let leftPoint = CGPoint(
            x: end.x - arrowHeadLength * cos(angle - arrowHeadAngle),
            y: end.y - arrowHeadLength * sin(angle - arrowHeadAngle)
        )
        let rightPoint = CGPoint(
            x: end.x - arrowHeadLength * cos(angle + arrowHeadAngle),
            y: end.y - arrowHeadLength * sin(angle + arrowHeadAngle)
        )

        path.move(to: end)
        path.addLine(to: leftPoint)
        path.move(to: end)
        path.addLine(to: rightPoint)

        return path
    }

    private func clamped(point: CGPoint, in size: CGSize) -> CGPoint {
        CGPoint(
            x: min(max(0, point.x), size.width),
            y: min(max(0, point.y), size.height)
        )
    }
}

private struct SelectionOverlay: View {
    let bounds: CGRect
    let showsResizeHandle: Bool

    var body: some View {
        ZStack(alignment: .topLeading) {
            RoundedRectangle(cornerRadius: 10)
                .stroke(style: StrokeStyle(lineWidth: 1.5, dash: [8, 6]))
                .foregroundStyle(.blue)
                .frame(width: max(bounds.width, 4), height: max(bounds.height, 4))
                .position(x: bounds.midX, y: bounds.midY)

            if showsResizeHandle {
                Circle()
                    .fill(Color.white)
                    .overlay(Circle().stroke(Color.blue, lineWidth: 2))
                    .frame(width: 14, height: 14)
                    .position(x: bounds.maxX, y: bounds.maxY)
            }
        }
    }
}
