#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import {
  scanNetwork,
  quickScan,
  scanIp,
  adbConnect,
  getAdbDevices,
  getAdbDeviceInfo,
  getLocalSubnet,
  DiscoveredDevice,
} from '../services/discovery';

const program = new Command();

program
  .name('iot-cli')
  .description('IoT Signage Manager CLI - Discover and manage devices')
  .version('1.0.0');

/**
 * Discover command - Scan network for devices
 */
program
  .command('discover')
  .alias('scan')
  .description('Scan the local network for IoT devices')
  .option('-q, --quick', 'Quick scan (ADB port only)', false)
  .option('-f, --full', 'Full network scan', false)
  .option('-i, --ip <ip>', 'Scan a specific IP address')
  .action(async (options) => {
    console.log(chalk.cyan.bold('\n🔍 IoT Device Discovery\n'));
    
    const subnet = getLocalSubnet();
    if (!subnet) {
      console.log(chalk.red('❌ Could not determine local network subnet'));
      process.exit(1);
    }
    
    console.log(chalk.gray(`Network: ${subnet}.0/24\n`));
    
    // Single IP scan
    if (options.ip) {
      const spinner = ora(`Scanning ${options.ip}...`).start();
      
      const device = await scanIp(options.ip);
      
      if (device) {
        spinner.succeed(chalk.green(`Found device at ${options.ip}`));
        printDevice(device);
      } else {
        spinner.fail(chalk.yellow(`No compatible device found at ${options.ip}`));
      }
      return;
    }
    
    // Network scan
    const mode = options.quick ? 'quick' : 'full';
    const spinner = ora(`Starting ${mode} scan...`).start();
    
    const devices: DiscoveredDevice[] = [];
    
    const scanFn = mode === 'quick' ? quickScan : scanNetwork;
    
    await scanFn(
      // Progress
      (current, total, found) => {
        spinner.text = `Scanning... ${current}/${total} (${found} devices found)`;
      },
      // Device found
      (device) => {
        devices.push(device);
        spinner.info(chalk.green(`Found: ${device.ip} (${device.deviceType})`));
        spinner.start();
      }
    );
    
    spinner.succeed(chalk.green(`Scan complete! Found ${devices.length} devices\n`));
    
    if (devices.length > 0) {
      console.log(chalk.cyan.bold('Discovered Devices:\n'));
      
      for (const device of devices) {
        printDevice(device);
      }
      
      // Offer to connect
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: 'Connect to a device via ADB', value: 'connect' },
            { name: 'Register a device', value: 'register' },
            { name: 'Exit', value: 'exit' },
          ],
        },
      ]);
      
      if (action === 'connect') {
        const adbDevices = devices.filter(d => d.adbEnabled);
        
        if (adbDevices.length === 0) {
          console.log(chalk.yellow('\nNo ADB-enabled devices found. Make sure ADB debugging is enabled on your devices.'));
          return;
        }
        
        const { ip } = await inquirer.prompt([
          {
            type: 'list',
            name: 'ip',
            message: 'Select a device to connect:',
            choices: adbDevices.map(d => ({
              name: `${d.ip} - ${d.vendor || d.deviceType}`,
              value: d.ip,
            })),
          },
        ]);
        
        const connectSpinner = ora(`Connecting to ${ip}...`).start();
        const result = await adbConnect(ip);
        
        if (result.success) {
          connectSpinner.succeed(chalk.green(result.message));
        } else {
          connectSpinner.fail(chalk.red(result.message));
        }
      } else if (action === 'register') {
        console.log(chalk.cyan('\nTo register devices, use the web interface at http://your-server/devices'));
      }
    } else {
      console.log(chalk.yellow('No compatible devices found. Make sure:'));
      console.log(chalk.gray('  1. Devices are powered on and connected to the network'));
      console.log(chalk.gray('  2. ADB debugging is enabled (for Fire TV: Settings > My Fire TV > Developer Options)'));
      console.log(chalk.gray('  3. Your server is on the same network subnet'));
    }
  });

/**
 * ADB command - Manage ADB connections
 */
program
  .command('adb')
  .description('Manage ADB connections')
  .option('-l, --list', 'List connected ADB devices')
  .option('-c, --connect <ip>', 'Connect to a device')
  .option('-i, --info <id>', 'Get device info')
  .action(async (options) => {
    if (options.list) {
      const spinner = ora('Getting connected devices...').start();
      const devices = await getAdbDevices();
      
      if (devices.length === 0) {
        spinner.info('No ADB devices connected');
      } else {
        spinner.succeed(`Found ${devices.length} connected device(s)\n`);
        
        for (const device of devices) {
          console.log(chalk.cyan(`  ${device.id}`) + chalk.gray(` (${device.status})`));
        }
      }
      return;
    }
    
    if (options.connect) {
      const spinner = ora(`Connecting to ${options.connect}...`).start();
      const result = await adbConnect(options.connect);
      
      if (result.success) {
        spinner.succeed(chalk.green(result.message));
      } else {
        spinner.fail(chalk.red(result.message));
      }
      return;
    }
    
    if (options.info) {
      const spinner = ora(`Getting device info...`).start();
      const info = await getAdbDeviceInfo(options.info);
      
      spinner.succeed('Device info:\n');
      
      for (const [key, value] of Object.entries(info)) {
        const label = key.replace('ro.', '').replace(/\./g, ' ');
        console.log(chalk.gray(`  ${label}:`) + ` ${value}`);
      }
      return;
    }
    
    // Interactive mode
    const devices = await getAdbDevices();
    
    console.log(chalk.cyan.bold('\n📱 ADB Device Manager\n'));
    
    if (devices.length > 0) {
      console.log(chalk.gray('Connected devices:'));
      for (const device of devices) {
        console.log(chalk.green(`  ✓ ${device.id}`) + chalk.gray(` (${device.status})`));
      }
      console.log();
    }
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          { name: 'Connect to new device', value: 'connect' },
          { name: 'Get device info', value: 'info' },
          { name: 'Disconnect device', value: 'disconnect' },
          { name: 'Exit', value: 'exit' },
        ],
      },
    ]);
    
    if (action === 'connect') {
      const { ip } = await inquirer.prompt([
        {
          type: 'input',
          name: 'ip',
          message: 'Enter device IP address:',
          validate: (input) => {
            const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
            return ipRegex.test(input) || 'Please enter a valid IP address';
          },
        },
      ]);
      
      const spinner = ora(`Connecting to ${ip}...`).start();
      const result = await adbConnect(ip);
      
      if (result.success) {
        spinner.succeed(chalk.green(result.message));
      } else {
        spinner.fail(chalk.red(result.message));
      }
    }
  });

/**
 * Status command - Show system status
 */
program
  .command('status')
  .description('Show system status')
  .action(async () => {
    console.log(chalk.cyan.bold('\n📊 IoT Signage Manager Status\n'));
    
    // Network info
    const subnet = getLocalSubnet();
    console.log(chalk.gray('Network:'));
    console.log(`  Subnet: ${subnet ? subnet + '.0/24' : 'Unknown'}`);
    console.log();
    
    // ADB devices
    const adbDevices = await getAdbDevices();
    console.log(chalk.gray('ADB Devices:'));
    if (adbDevices.length === 0) {
      console.log(chalk.yellow('  No devices connected'));
    } else {
      for (const device of adbDevices) {
        const statusColor = device.status === 'device' ? chalk.green : chalk.yellow;
        console.log(`  ${statusColor('●')} ${device.id} (${device.status})`);
      }
    }
    console.log();
  });

// Helper function to print device info
function printDevice(device: DiscoveredDevice) {
  const typeColors: Record<string, typeof chalk> = {
    fire_tv: chalk.hex('#FF9900'),
    android: chalk.green,
    roku: chalk.hex('#662D91'),
    chromecast: chalk.hex('#4285F4'),
    unknown: chalk.gray,
  };
  
  const color = typeColors[device.deviceType] || chalk.white;
  
  console.log(chalk.white.bold(`  ${device.ip}`));
  console.log(chalk.gray(`    Type: `) + color(device.deviceType.replace('_', ' ').toUpperCase()));
  
  if (device.mac) {
    console.log(chalk.gray(`    MAC: `) + device.mac);
  }
  if (device.vendor) {
    console.log(chalk.gray(`    Vendor: `) + device.vendor);
  }
  
  console.log(chalk.gray(`    ADB: `) + (device.adbEnabled ? chalk.green('✓ Enabled') : chalk.red('✗ Disabled')));
  
  if (device.openPorts.length > 0) {
    console.log(chalk.gray(`    Ports: `) + device.openPorts.join(', '));
  }
  
  console.log();
}

// Run the program
program.parse();
