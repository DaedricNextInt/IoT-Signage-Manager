import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@localhost' },
    update: {},
    create: {
      email: 'admin@localhost',
      password: adminPassword,
      name: 'Administrator',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create device groups
  const officeGroup = await prisma.deviceGroup.upsert({
    where: { id: 'group-office' },
    update: {},
    create: {
      id: 'group-office',
      name: 'Office Displays',
      description: 'All office and conference room displays',
    },
  });

  const homeGroup = await prisma.deviceGroup.upsert({
    where: { id: 'group-home' },
    update: {},
    create: {
      id: 'group-home',
      name: 'Home Devices',
      description: 'Personal home entertainment devices',
    },
  });
  console.log('✅ Created device groups');

  // Create sample devices
  const devices = [
    {
      deviceId: 'fire-tv-001',
      name: 'Lobby Display',
      description: 'Main lobby digital signage',
      status: 'ONLINE' as const,
      model: 'Fire TV Stick 4K',
      ipAddress: '192.168.1.101',
      locationName: 'Lobby',
      locationFloor: '1st Floor',
      locationBuilding: 'Main Building',
      groupId: officeGroup.id,
      lastSeen: new Date(),
      lastHeartbeat: new Date(),
    },
    {
      deviceId: 'fire-tv-002',
      name: 'Conference Room A',
      description: 'Conference room display',
      status: 'ONLINE' as const,
      model: 'Fire TV Stick 4K Max',
      ipAddress: '192.168.1.102',
      locationName: 'Conference Room A',
      locationFloor: '2nd Floor',
      locationBuilding: 'Main Building',
      groupId: officeGroup.id,
      lastSeen: new Date(),
      lastHeartbeat: new Date(),
    },
    {
      deviceId: 'fire-tv-003',
      name: 'Living Room Display',
      description: 'Home entertainment display',
      status: 'OFFLINE' as const,
      model: 'Fire TV Stick Lite',
      ipAddress: '192.168.1.103',
      locationName: 'Living Room',
      locationBuilding: 'Home',
      groupId: homeGroup.id,
      lastSeen: new Date(Date.now() - 3600000),
    },
  ];

  for (const device of devices) {
    await prisma.device.upsert({
      where: { deviceId: device.deviceId },
      update: {},
      create: device,
    });
  }
  console.log('✅ Created sample devices');

  // Create sample alerts
  await prisma.alert.createMany({
    skipDuplicates: true,
    data: [
      {
        alertType: 'DEVICE_OFFLINE',
        message: 'Device connection lost - Living Room Display has been offline',
        severity: 'WARNING',
        deviceId: (await prisma.device.findUnique({ where: { deviceId: 'fire-tv-003' } }))?.id,
      },
    ],
  });
  console.log('✅ Created sample alerts');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
