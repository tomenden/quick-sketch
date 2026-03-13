import AppKit
import UniformTypeIdentifiers

enum ClipboardService {
    @discardableResult
    static func copySketch(from sketchStore: SketchStore) -> Bool {
        guard sketchStore.hasContent else { return false }
        guard let rendered = renderImage(from: sketchStore) else { return false }

        let pasteboard = NSPasteboard.general
        pasteboard.clearContents()
        pasteboard.setData(rendered.pngData, forType: .png)
        return pasteboard.writeObjects([rendered.image])
    }

    fileprivate static func renderImage(from sketchStore: SketchStore) -> RenderedSketch? {
        let elements = allElements(from: sketchStore)
        guard !elements.isEmpty else { return nil }

        let padding: CGFloat = 24
        let bounds = drawingBounds(for: elements).insetBy(dx: -padding, dy: -padding)
        let pixelSize = CGSize(width: max(1, bounds.width.rounded(.up)), height: max(1, bounds.height.rounded(.up)))
        let imageRect = CGRect(origin: .zero, size: pixelSize)

        guard
            let context = CGContext(
                data: nil,
                width: Int(pixelSize.width),
                height: Int(pixelSize.height),
                bitsPerComponent: 8,
                bytesPerRow: 0,
                space: CGColorSpace(name: CGColorSpace.sRGB)!,
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
            )
        else {
            return nil
        }

        context.setFillColor(NSColor.white.cgColor)
        context.fill(imageRect)

        context.translateBy(x: 0, y: pixelSize.height)
        context.scaleBy(x: 1, y: -1)
        context.translateBy(x: -bounds.minX, y: -bounds.minY)

        for element in elements {
            render(element: element, in: context)
        }

        guard let cgImage = context.makeImage() else { return nil }
        let image = NSImage(cgImage: cgImage, size: pixelSize)
        let bitmapRep = NSBitmapImageRep(cgImage: cgImage)
        guard let pngData = bitmapRep.representation(using: .png, properties: [:]) else { return nil }

        return RenderedSketch(image: image, pngData: pngData)
    }

    private static func render(element: SketchElement, in context: CGContext) {
        switch element {
        case .stroke(let stroke):
            render(stroke: stroke, in: context)
        case .shape(let shape):
            render(shape: shape, in: context)
        case .text(let text):
            render(text: text, in: context)
        }
    }

    private static func render(stroke: SketchStroke, in context: CGContext) {
        guard let firstPoint = stroke.points.first?.cgPoint else { return }
        let cgColor = stroke.color.usingColorSpace(.sRGB)?.cgColor ?? stroke.color.cgColor

        context.setLineCap(.round)
        context.setLineJoin(.round)
        context.setLineWidth(stroke.lineWidth)
        context.setStrokeColor(cgColor)
        context.setFillColor(cgColor)

        if stroke.points.count == 1 {
            let dotRect = CGRect(
                x: firstPoint.x - stroke.lineWidth / 2,
                y: firstPoint.y - stroke.lineWidth / 2,
                width: stroke.lineWidth,
                height: stroke.lineWidth
            )
            context.fillEllipse(in: dotRect)
        } else {
            context.beginPath()
            context.move(to: firstPoint)
            for point in stroke.points.dropFirst() {
                context.addLine(to: point.cgPoint)
            }
            context.strokePath()
        }
    }

    private static func render(shape: SketchShape, in context: CGContext) {
        let cgColor = shape.color.usingColorSpace(.sRGB)?.cgColor ?? shape.color.cgColor
        context.setLineCap(.round)
        context.setLineJoin(.round)
        context.setLineWidth(shape.lineWidth)
        context.setStrokeColor(cgColor)

        switch shape.kind {
        case .rectangle:
            context.stroke(shape.rect)
        case .ellipse:
            context.strokeEllipse(in: shape.rect)
        case .arrow:
            let start = shape.start.cgPoint
            let end = shape.end.cgPoint
            let angle = atan2(end.y - start.y, end.x - start.x)
            let arrowHeadLength = max(14, shape.lineWidth * 3.5)
            let arrowHeadAngle = CGFloat.pi / 7

            let leftPoint = CGPoint(
                x: end.x - arrowHeadLength * cos(angle - arrowHeadAngle),
                y: end.y - arrowHeadLength * sin(angle - arrowHeadAngle)
            )
            let rightPoint = CGPoint(
                x: end.x - arrowHeadLength * cos(angle + arrowHeadAngle),
                y: end.y - arrowHeadLength * sin(angle + arrowHeadAngle)
            )

            context.beginPath()
            context.move(to: start)
            context.addLine(to: end)
            context.move(to: end)
            context.addLine(to: leftPoint)
            context.move(to: end)
            context.addLine(to: rightPoint)
            context.strokePath()
        }
    }

    private static func render(text: SketchText, in context: CGContext) {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: NSFont.systemFont(ofSize: text.fontSize, weight: .semibold),
            .foregroundColor: text.color,
        ]

        let attributed = NSAttributedString(string: text.text, attributes: attributes)
        let point = CGPoint(x: text.origin.x, y: text.origin.y)

        context.saveGState()
        context.translateBy(x: point.x, y: point.y)
        context.scaleBy(x: 1, y: -1)
        attributed.draw(at: .zero)
        context.restoreGState()
    }

    private static func allElements(from sketchStore: SketchStore) -> [SketchElement] {
        var elements = sketchStore.elements
        if let activeElement = sketchStore.activeElement {
            elements.append(activeElement)
        }
        return elements
    }

    private static func drawingBounds(for elements: [SketchElement]) -> CGRect {
        elements.reduce(into: CGRect.null) { partialResult, element in
            partialResult = partialResult.union(SketchGeometry.bounds(for: element))
        }
    }
}

private struct RenderedSketch {
    var image: NSImage
    var pngData: Data
}

private extension NSPasteboard.PasteboardType {
    static let png = NSPasteboard.PasteboardType(UTType.png.identifier)
}
