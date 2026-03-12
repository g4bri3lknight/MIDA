import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

async function seedAdmin() {
  console.log('Seeding admin user...');
  
  // Delete existing admin to recreate with correct password
  const existingAdmin = await db.user.findUnique({
    where: { username: 'admin' },
  });

  if (existingAdmin) {
    // Delete and recreate to ensure correct password hash
    await db.user.delete({
      where: { username: 'admin' },
    });
    console.log('Deleted existing admin user');
  }

  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await db.user.create({
    data: {
      username: 'admin',
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
