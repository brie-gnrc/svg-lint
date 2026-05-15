import SwiftUI
import UIKit

private let RTLD_DEFAULT_HANDLE: UnsafeMutableRawPointer! = dlopen(nil, RTLD_NOW)

struct SVGImageView: View {
    let url: URL

    var body: some View {
        if let image = loadSVG(from: url) {
            Image(uiImage: image)
                .resizable()
                .aspectRatio(contentMode: .fit)
        } else {
            Image(systemName: "exclamationmark.triangle")
                .foregroundColor(.red)
                .font(.title)
        }
    }

    private func loadSVG(from url: URL) -> UIImage? {
        guard let data = try? Data(contentsOf: url) else {
            NSLog("[SVGPreview] Failed to read file at: %@", url.path)
            return nil
        }
        NSLog("[SVGPreview] Loaded %d bytes from %@", data.count, url.lastPathComponent)
        let image = CoreSVGBridge.renderSVG(data: data)
        NSLog("[SVGPreview] Render result: %@", image != nil ? "success \(image!.size)" : "nil")
        return image
    }
}

private class CoreSVGBridge {
    private typealias CreateFromDataFunc = @convention(c) (CFData, CFDictionary?) -> OpaquePointer?
    private typealias GetCanvasSizeFunc = @convention(c) (OpaquePointer) -> CGSize
    private typealias RenderFunc = @convention(c) (CGContext, OpaquePointer) -> Void

    private static let createFromData: CreateFromDataFunc? = {
        guard let sym = dlsym(RTLD_DEFAULT_HANDLE, "CGSVGDocumentCreateFromData") else { return nil }
        return unsafeBitCast(sym, to: CreateFromDataFunc.self)
    }()

    private static let getCanvasSize: GetCanvasSizeFunc? = {
        guard let sym = dlsym(RTLD_DEFAULT_HANDLE, "CGSVGDocumentGetCanvasSize") else { return nil }
        return unsafeBitCast(sym, to: GetCanvasSizeFunc.self)
    }()

    private static let render: RenderFunc? = {
        guard let sym = dlsym(RTLD_DEFAULT_HANDLE, "CGContextDrawSVGDocument") else { return nil }
        return unsafeBitCast(sym, to: RenderFunc.self)
    }()

    static func renderSVG(data: Data) -> UIImage? {
        NSLog("[SVGPreview] createFromData sym: %@", createFromData != nil ? "found" : "MISSING")
        NSLog("[SVGPreview] getCanvasSize sym: %@", getCanvasSize != nil ? "found" : "MISSING")
        NSLog("[SVGPreview] render sym: %@", render != nil ? "found" : "MISSING")

        guard let createFromData = createFromData,
              let getCanvasSize = getCanvasSize,
              let render = render else {
            NSLog("[SVGPreview] Failed to resolve CoreSVG symbols")
            return nil
        }

        let cfData = data as CFData
        guard let doc = createFromData(cfData, nil) else {
            NSLog("[SVGPreview] CGSVGDocumentCreateFromData returned nil for %d bytes", data.count)
            return nil
        }

        let size = getCanvasSize(doc)
        let renderSize = CGSize(
            width: size.width > 0 ? size.width : 300,
            height: size.height > 0 ? size.height : 300
        )

        let renderer = UIGraphicsImageRenderer(size: renderSize)
        return renderer.image { ctx in
            let context = ctx.cgContext
            context.translateBy(x: 0, y: renderSize.height)
            context.scaleBy(x: 1, y: -1)
            render(context, doc)
        }
    }
}
