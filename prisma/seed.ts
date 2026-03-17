import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  console.log('Seeding admin user...');
  
  // Delete existing admin if exists (to reset any issues)
  const existingAdmin = await db.user.findFirst({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    console.log('Deleting existing admin user...');
    await db.user.delete({
      where: { id: existingAdmin.id },
    });
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await db.user.create({
    data: {
      username: 'admin', // salvato in lowercase
      password: hashedPassword,
      name: 'Administrator',
      email: 'admin@mida.local',
      role: 'ADMIN',
      active: true,
    },
  });

  console.log('Admin user created:', admin.username);
  console.log('Default password: admin123');
  console.log('Please change the password after first login!');
}

seedAdmin()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed error:', error);
    process.exit(1);
  });
