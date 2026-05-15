import SwiftUI

struct SVGDetailView: View {
    let url: URL
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text(url.lastPathComponent)
                    .font(.headline)

                SVGImageView(url: url)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(
                        CheckerboardBackground()
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .padding()

                Text("Rendered by iOS CoreSVG via UIImage")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .navigationTitle("Detail")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

struct CheckerboardBackground: View {
    var body: some View {
        Canvas { context, size in
            let tileSize: CGFloat = 10
            for row in 0..<Int(size.height / tileSize) + 1 {
                for col in 0..<Int(size.width / tileSize) + 1 {
                    let isLight = (row + col) % 2 == 0
                    let rect = CGRect(x: CGFloat(col) * tileSize, y: CGFloat(row) * tileSize, width: tileSize, height: tileSize)
                    context.fill(Path(rect), with: .color(isLight ? .white : Color(.systemGray5)))
                }
            }
        }
    }
}
