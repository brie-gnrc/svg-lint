# Figgity — getting started (for designers)

Figgity checks your SVG exports before they go into the app. It catches things that look fine in Figma or your browser but break on iOS. You can also preview exactly how an iPhone will render your SVGs — no Xcode knowledge needed.

## One-time setup

You only need to do this once on your Mac.

### 1. Install Xcode

Open the App Store, search "Xcode", and install it. It's large (~12 GB) so give it time. Once installed, open it once and accept the license agreement.

### 2. Install Node.js

Go to https://nodejs.org and download the LTS version. Run the installer — accept all defaults.

To verify it worked, open **Terminal** (search "Terminal" in Spotlight) and type:

```
node --version
```

You should see a version number like `v20.x.x`. If you see "command not found", restart Terminal and try again.

### 3. Install Figgity

In Terminal, navigate to wherever the svg-lint folder lives on your machine. If someone shared it with you via OneDrive, it might be something like:

```
cd ~/claude-projects/svg-lint
```

Then run:

```
npm install
```

Wait for it to finish. You're done with setup.

---

## Using the web interface (recommended)

This is the easiest way to check your SVGs. In Terminal, run:

```
npm start
```

You'll see a message that says the GUI is running. Open your browser and go to:

**http://localhost:3100**

From there:

1. Drag your SVG files onto the page (or click to browse)
2. Click **Check compatibility** to see if anything will break on iOS
3. Click **Launch on simulator** to see how iOS actually renders them

Leave that Terminal window open while you're working. When you're done, press `Ctrl + C` in Terminal to stop it.

---

## Understanding the results

When you check compatibility, each file gets a status:

- **Red errors** — this will definitely break on iOS. Needs to be fixed before handing off to dev.
- **Yellow warnings** — might cause subtle rendering issues. Worth a look.
- **Blue info** — cosmetic or minor. Usually fine to ignore.

Each issue includes a suggestion for how to fix it in your design tool.

---

## Common fixes in Figma

| Issue | What to do in Figma |
|-------|---------------------|
| Filters (blur, drop shadow) | Flatten the layer or export without effects |
| Text elements | Outline all text (right-click → Outline stroke) |
| Blend modes | Flatten layers that use Multiply, Overlay, etc. |
| Masks | Flatten masked groups or use clip paths on simple shapes |
| Embedded images | Remove any raster images from the SVG |
| CSS styling / style blocks | Use "Inline style" in Figma's SVG export settings |
| Media queries | Remove dark mode variants — export as separate light/dark files |

For the full design guidelines, see [DESIGN-GUIDELINES.md](./DESIGN-GUIDELINES.md).

---

## Quick reference

| What you want to do | Command |
|---------------------|---------|
| Open the web interface | `npm start` |
| Check files without the GUI | `npm run lint -- my-icon.svg` |
| Preview on simulator | `npm run preview -- my-icon.svg` |

---

## Troubleshooting

**"command not found: npm"**
Node.js isn't installed or Terminal needs to be restarted. Close Terminal, reopen it, try again.

**"Cannot find module" or "ERR_MODULE_NOT_FOUND"**
You need to run `npm install` in the svg-lint folder first.

**The simulator shows an error triangle instead of my SVG**
Your SVG has an unsupported feature. Run "Check compatibility" in the web interface to find out what's wrong.

**The web interface won't load**
Make sure Terminal still shows the server running. If you closed it, run `npm start` again.

**"xcrun: error: unable to find utility"**
Open Xcode once, go to Settings → Locations, and set the Command Line Tools dropdown to the latest Xcode version.
