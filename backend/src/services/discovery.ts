import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { networkInterfaces } from 'os';
import { Socket } from 'net';

const execAsync = promisify(exec);

export interface DiscoveredDevice {
  ip: string;
  mac?: string;
  hostname?: string;
  vendor?: string;
  deviceType: 'fire_tv' | 'android' | 'roku' | 'chromecast' | 'unknown';
  adbEnabled: boolean;
  openPorts: number[];
  lastSeen: Date;
}

// Known MAC address prefixes for device identification
const MAC_VENDORS: Record<string, { vendor: string; deviceType: DiscoveredDevice['deviceType'] }> = {
  // Amazon (Fire TV)
  '00:FC:8B': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '0C:47:C9': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '10:AE:60': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '18:74:2E': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '34:D2:70': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '38:F7:3D': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '40:B4:CD': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '44:65:0D': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '4C:EF:C0': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '50:F5:DA': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '68:37:E9': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '68:54:FD': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '74:C2:46': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '78:E1:03': { vendor: 'Amazon', deviceType: 'fire_tv' },
  '84:D6:D0': { vendor: 'Amazon', deviceType: 'fire_tv' },
  'A0:02:DC': { vendor: 'Amazon', deviceType: 'fire_tv' },
  'AC:63:BE': { vendor: 'Amazon', deviceType: 'fire_tv' },
  'B4:7C:9C': { vendor: 'Amazon', deviceType: 'fire_tv' },
  'F0:27:2D': { vendor: 'Amazon', deviceType: 'fire_tv' },
  'F0:4F:7C': { vendor: 'Amazon', deviceType: 'fire_tv' },
  'FC:65:DE': { vendor: 'Amazon', deviceType: 'fire_tv' },
  // Google (Chromecast)
  '54:60:09': { vendor: 'Google', deviceType: 'chromecast' },
  '6C:AD:F8': { vendor: 'Google', deviceType: 'chromecast' },
  'D8:6C:63': { vendor: 'Google', deviceType: 'chromecast' },
  'F4:F5:D8': { vendor: 'Google', deviceType: 'chromecast' },
  // Roku
  '08:05:81': { vendor: 'Roku', deviceType: 'roku' },
  '10:59:32': { vendor: 'Roku', deviceType: 'roku' },
  'B0:A7:37': { vendor: 'Roku', deviceType: 'roku' },
  'B8:3E:59': { vendor: 'Roku', deviceType: 'roku' },
  'C8:3A:6B': { vendor: 'Roku', deviceType: 'roku' },
  'D4:E2:2F': { vendor: 'Roku', deviceType: 'roku' },
  'DC:3A:5E': { vendor: 'Roku', deviceType: 'roku' },
};

// Ports to check for device identification
const PORTS_TO_CHECK = [
  { port: 5555, name: 'ADB' },           // Android Debug Bridge
  { port: 8008, name: 'Chromecast' },    // Google Cast
  { port: 8060, name: 'Roku' },          // Roku ECP
  { port: 8443, name: 'Fire TV' },       // Fire TV API
  { port: 9000, name: 'Android' },       // Common Android
];

/**
 * Get the local network subnet
 */
export function getLocalSubnet(): string | null {
  const interfaces = networkInterfaces();
  
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    
    for (const addr of addrs) {
      // Skip loopback and non-IPv4
      if (addr.family !== 'IPv4' || addr.internal) continue;
      
      // Get subnet (e.g., 192.168.1.0/24)
      const parts = addr.address.split('.');
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
  }
  
  return null;
}

/**
 * Check if a specific port is open on a host
 */
export async function checkPort(host: string, port: number, timeout: number = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
}

/**
 * Ping a host to check if it's alive
 */
export async function pingHost(ip: string, timeout: number = 1000): Promise<boolean> {
  try {
    // Use fping if available (faster), otherwise ping
    const { stdout } = await execAsync(`ping -c 1 -W 1 ${ip} 2>/dev/null`, { timeout: timeout + 500 });
    return stdout.includes('1 received') || stdout.includes('1 packets received');
  } catch {
    return false;
  }
}

/**
 * Get MAC address for an IP using ARP
 */
export async function getMacAddress(ip: string): Promise<string | null> {
  try {
    // First try arp command
    const { stdout } = await execAsync(`arp -n ${ip} 2>/dev/null || ip neigh show ${ip} 2>/dev/null`);
    
    // Parse MAC from output
    const macMatch = stdout.match(/([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/);
    if (macMatch) {
      return macMatch[0].toUpperCase().replace(/-/g, ':');
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Identify device type from MAC address
 */
export function identifyDeviceFromMac(mac: string): { vendor: string; deviceType: DiscoveredDevice['deviceType'] } | null {
  if (!mac) return null;
  
  const prefix = mac.substring(0, 8).toUpperCase();
  return MAC_VENDORS[prefix] || null;
}

/**
 * Check if ADB is enabled on a device
 */
export async function checkAdbEnabled(ip: string): Promise<boolean> {
  return checkPort(ip, 5555, 2000);
}

/**
 * Scan a single IP address
 */
export async function scanIp(ip: string): Promise<DiscoveredDevice | null> {
  // First check if host is alive
  const isAlive = await pingHost(ip);
  if (!isAlive) return null;
  
  // Get MAC address
  const mac = await getMacAddress(ip);
  
  // Identify from MAC
  const macInfo = mac ? identifyDeviceFromMac(mac) : null;
  
  // Check important ports
  const openPorts: number[] = [];
  const portChecks = await Promise.all(
    PORTS_TO_CHECK.map(async ({ port }) => {
      const isOpen = await checkPort(ip, port);
      return { port, isOpen };
    })
  );
  
  for (const { port, isOpen } of portChecks) {
    if (isOpen) openPorts.push(port);
  }
  
  // Determine device type
  let deviceType: DiscoveredDevice['deviceType'] = macInfo?.deviceType || 'unknown';
  
  // Override based on open ports if MAC didn't identify
  if (deviceType === 'unknown') {
    if (openPorts.includes(5555)) deviceType = 'android';
    if (openPorts.includes(8060)) deviceType = 'roku';
    if (openPorts.includes(8008)) deviceType = 'chromecast';
  }
  
  // Only return if we found something interesting
  if (openPorts.length === 0 && deviceType === 'unknown') {
    return null;
  }
  
  return {
    ip,
    mac: mac || undefined,
    vendor: macInfo?.vendor,
    deviceType,
    adbEnabled: openPorts.includes(5555),
    openPorts,
    lastSeen: new Date(),
  };
}

/**
 * Scan the entire local network
 */
export async function scanNetwork(
  onProgress?: (current: number, total: number, found: number) => void,
  onDeviceFound?: (device: DiscoveredDevice) => void
): Promise<DiscoveredDevice[]> {
  const subnet = getLocalSubnet();
  if (!subnet) {
    throw new Error('Could not determine local subnet');
  }
  
  const devices: DiscoveredDevice[] = [];
  const total = 254;
  let completed = 0;
  
  // Scan in batches to avoid overwhelming the network
  const batchSize = 20;
  const ips: string[] = [];
  
  for (let i = 1; i <= 254; i++) {
    ips.push(`${subnet}.${i}`);
  }
  
  // Process in batches
  for (let i = 0; i < ips.length; i += batchSize) {
    const batch = ips.slice(i, i + batchSize);
    
    const results = await Promise.all(
      batch.map(async (ip) => {
        const device = await scanIp(ip);
        completed++;
        onProgress?.(completed, total, devices.length);
        return device;
      })
    );
    
    for (const device of results) {
      if (device) {
        devices.push(device);
        onDeviceFound?.(device);
      }
    }
  }
  
  return devices;
}

/**
 * Quick scan - only checks common Fire TV / Android ports
 */
export async function quickScan(
  onProgress?: (current: number, total: number, found: number) => void,
  onDeviceFound?: (device: DiscoveredDevice) => void
): Promise<DiscoveredDevice[]> {
  const subnet = getLocalSubnet();
  if (!subnet) {
    throw new Error('Could not determine local subnet');
  }
  
  const devices: DiscoveredDevice[] = [];
  const total = 254;
  let completed = 0;
  
  // Only check ADB port (5555) for quick discovery
  const batchSize = 50;
  const ips: string[] = [];
  
  for (let i = 1; i <= 254; i++) {
    ips.push(`${subnet}.${i}`);
  }
  
  for (let i = 0; i < ips.length; i += batchSize) {
    const batch = ips.slice(i, i + batchSize);
    
    const results = await Promise.all(
      batch.map(async (ip) => {
        const hasAdb = await checkPort(ip, 5555, 500);
        completed++;
        onProgress?.(completed, total, devices.length);
        
        if (hasAdb) {
          // Do a full scan on this IP
          return scanIp(ip);
        }
        return null;
      })
    );
    
    for (const device of results) {
      if (device) {
        devices.push(device);
        onDeviceFound?.(device);
      }
    }
  }
  
  return devices;
}

/**
 * Attempt to connect to a device via ADB
 */
export async function adbConnect(ip: string): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout, stderr } = await execAsync(`adb connect ${ip}:5555`, { timeout: 10000 });
    
    if (stdout.includes('connected') || stdout.includes('already connected')) {
      return { success: true, message: stdout.trim() };
    }
    
    return { success: false, message: stderr || stdout || 'Connection failed' };
  } catch (error: any) {
    return { success: false, message: error.message || 'ADB not available' };
  }
}

/**
 * Get list of ADB-connected devices
 */
export async function getAdbDevices(): Promise<Array<{ id: string; status: string }>> {
  try {
    const { stdout } = await execAsync('adb devices', { timeout: 5000 });
    
    const lines = stdout.split('\n').slice(1); // Skip header
    const devices: Array<{ id: string; status: string }> = [];
    
    for (const line of lines) {
      const match = line.match(/^(\S+)\s+(\S+)/);
      if (match) {
        devices.push({ id: match[1], status: match[2] });
      }
    }
    
    return devices;
  } catch {
    return [];
  }
}

/**
 * Install APK on device via ADB
 */
export async function adbInstallApk(deviceId: string, apkPath: string): Promise<{ success: boolean; message: string }> {
  try {
    const { stdout, stderr } = await execAsync(`adb -s ${deviceId} install -r "${apkPath}"`, { timeout: 120000 });
    
    if (stdout.includes('Success')) {
      return { success: true, message: 'APK installed successfully' };
    }
    
    return { success: false, message: stderr || stdout || 'Installation failed' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

/**
 * Get device info via ADB
 */
export async function getAdbDeviceInfo(deviceId: string): Promise<Record<string, string>> {
  const info: Record<string, string> = {};
  
  const props = [
    'ro.product.model',
    'ro.product.brand',
    'ro.product.name',
    'ro.build.version.release',
    'ro.serialno',
  ];
  
  for (const prop of props) {
    try {
      const { stdout } = await execAsync(`adb -s ${deviceId} shell getprop ${prop}`, { timeout: 5000 });
      info[prop] = stdout.trim();
    } catch {
      // Skip if property not available
    }
  }
  
  return info;
}
