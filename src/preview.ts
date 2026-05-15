import { execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { resolve, basename } from 'node:path';
import { existsSync, writeFileSync } from 'node:fs';

const BUNDLE_ID = 'com.svglint.SVGPreview';
const PROJECT_DIR = resolve(import.meta.dirname, '..', 'SVGPreview');
const DEFAULT_DEVICE = 'iPhone 16 Pro';

interface PreviewOptions {
  device?: string;
  deviceId?: string;
}

function exec(cmd: string, opts?: { silent?: boolean }): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: opts?.silent ? 'pipe' : 'inherit' });
  } catch (e: any) {
    if (opts?.silent) return e.stdout || '';
    throw e;
  }
}

function execOut(cmd: string): string {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

function findDeviceId(deviceName?: string): string {
  const name = deviceName || DEFAULT_DEVICE;
  const output = execOut('xcrun simctl list devices available');
  const regex = new RegExp(`${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+\\(([A-F0-9-]+)\\)`, 'i');
  const match = output.match(regex);
  if (!match) {
    throw new Error(`Simulator device "${name}" not found. Available devices:\n${output}`);
  }
  return match[1];
}

function getAppDataPath(deviceId: string): string {
  const output = execOut(`xcrun simctl get_app_container ${deviceId} ${BUNDLE_ID} data 2>/dev/null || echo ""`);
  if (!output) {
    throw new Error('SVGPreview app not installed. Building and installing...');
  }
  return output;
}

export async function preview(svgFiles: string[], options: PreviewOptions): Promise<void> {
  const deviceId = options.deviceId || findDeviceId(options.device);
  console.log(`Using simulator: ${deviceId}`);

  // Boot simulator if needed
  const deviceList = execOut('xcrun simctl list devices');
  if (!deviceList.includes(`(${deviceId}) (Booted)`)) {
    console.log('Booting simulator...');
    exec(`xcrun simctl boot ${deviceId}`, { silent: true });
  }

  // Open Simulator.app
  exec('open -a Simulator', { silent: true });

  // Build and install the app
  const appPath = buildApp(deviceId);
  console.log('Installing SVGPreview app...');
  exec(`xcrun simctl install ${deviceId} "${appPath}"`, { silent: true });

  // Launch app once to create data container, then terminate
  exec(`xcrun simctl launch ${deviceId} ${BUNDLE_ID}`, { silent: true });
  await sleep(1000);
  exec(`xcrun simctl terminate ${deviceId} ${BUNDLE_ID}`, { silent: true });

  // Get the app's data container
  const dataPath = execOut(`xcrun simctl get_app_container ${deviceId} ${BUNDLE_ID} data`);
  const docsPath = `${dataPath}/Documents`;

  // Ensure Documents directory exists
  exec(`mkdir -p "${docsPath}"`, { silent: true });

  // Clear old SVGs and copy new ones
  exec(`rm -f "${docsPath}"/*.svg`, { silent: true });

  for (const file of svgFiles) {
    const absPath = resolve(file);
    if (!existsSync(absPath)) {
      console.error(`File not found: ${absPath}`);
      continue;
    }
    exec(`cp "${absPath}" "${docsPath}/${basename(absPath)}"`, { silent: true });
    console.log(`  Pushed: ${basename(absPath)}`);
  }

  // Relaunch the app with the SVGs loaded
  console.log('Launching SVGPreview...');
  exec(`xcrun simctl launch ${deviceId} ${BUNDLE_ID}`, { silent: true });

  console.log(`\n✓ ${svgFiles.length} SVG(s) loaded in SVGPreview on simulator`);
  console.log('  Tap any thumbnail to see full-size CoreSVG rendering');
}

export async function previewFromBuffers(files: { name: string; buffer: Buffer }[]): Promise<void> {
  const deviceId = findDeviceId();

  const deviceList = execOut('xcrun simctl list devices');
  if (!deviceList.includes(`(${deviceId}) (Booted)`)) {
    exec(`xcrun simctl boot ${deviceId}`, { silent: true });
  }
  exec('open -a Simulator', { silent: true });

  const appPath = buildApp(deviceId);
  exec(`xcrun simctl install ${deviceId} "${appPath}"`, { silent: true });

  // Get data container (create it by launching once only if needed)
  let dataPath = execOut(`xcrun simctl get_app_container ${deviceId} ${BUNDLE_ID} data 2>/dev/null || echo ""`);
  if (!dataPath) {
    exec(`xcrun simctl launch ${deviceId} ${BUNDLE_ID}`, { silent: true });
    await sleep(1000);
    exec(`xcrun simctl terminate ${deviceId} ${BUNDLE_ID}`, { silent: true });
    dataPath = execOut(`xcrun simctl get_app_container ${deviceId} ${BUNDLE_ID} data`);
  }

  const docsPath = `${dataPath}/Documents`;
  exec(`mkdir -p "${docsPath}"`, { silent: true });
  exec(`rm -f "${docsPath}"/*.svg`, { silent: true });

  for (const file of files) {
    writeFileSync(`${docsPath}/${file.name}`, file.buffer);
  }

  // Terminate if already running, then launch fresh
  exec(`xcrun simctl terminate ${deviceId} ${BUNDLE_ID} 2>/dev/null || true`, { silent: true });
  exec(`xcrun simctl launch ${deviceId} ${BUNDLE_ID}`, { silent: true });
}

function buildApp(deviceId: string): string {
  const derivedDataPath = resolve(PROJECT_DIR, '.build');
  console.log('Building SVGPreview app...');
  exec(
    `xcodebuild -project "${PROJECT_DIR}/SVGPreview.xcodeproj" -scheme SVGPreview ` +
    `-destination "platform=iOS Simulator,id=${deviceId}" ` +
    `-configuration Debug ` +
    `-derivedDataPath "${derivedDataPath}" ` +
    `build 2>&1 | tail -1`,
    { silent: true }
  );

  const appPath = `${derivedDataPath}/Build/Products/Debug-iphonesimulator/SVGPreview.app`;
  if (!existsSync(appPath)) {
    throw new Error(`Build failed: ${appPath} not found. Run xcodebuild manually to see errors.`);
  }
  return appPath;
}
