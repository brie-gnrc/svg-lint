import SwiftUI

struct SVGDetailView: View {
    let url: URL
    let isLightMode: Bool
    @Environment(\.dismiss) private var dismiss

    private var surfaceColor: Color {
        isLightMode ? Color(red: 0.953, green: 0.965, blue: 0.973) : Color(red: 0.067, green: 0.094, blue: 0.153)
    }

    var body: some View {
        NavigationView {
            VStack {
                SVGImageView(url: url)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .aspectRatio(contentMode: .fit)
                    .padding()
            }
            .background(surfaceColor)
            .navigationTitle(url.lastPathComponent)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .preferredColorScheme(isLightMode ? .light : .dark)
    }
}
