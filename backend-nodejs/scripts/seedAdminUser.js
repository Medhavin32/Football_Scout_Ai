import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { auth } from '../src/config/firebaseConfig.js';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function seedAdminUser() {
  try {
    const adminEmail = 'admin@footballscout.ai';
    const adminPassword = 'Admin@123'; // Change this to your desired password
    const adminName = 'System Admin';

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create user in Firebase first
    let firebaseUser;
    try {
      firebaseUser = await auth.createUser({
        email: adminEmail,
        password: adminPassword,
        displayName: adminName
      });
      console.log('Firebase user created:', firebaseUser.uid);
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-exists') {
        console.log('Firebase user already exists, continuing...');
      } else {
        throw firebaseError;
      }
    }

    // Upsert admin user (will create if not exists, update if exists)
    const adminUser = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        name: adminName,
        verificationStatus: 'VERIFIED' // Admin is auto-verified
      },
      create: {
        name: adminName,
        email: adminEmail,
        password: hashedPassword,
        role: 'ADMIN',
        verificationStatus: 'VERIFIED' // Admin is auto-verified
      }
    });

    console.log('Admin user created/updated successfully:');
    console.log('Email:', adminUser.email);
    console.log('Role:', adminUser.role);
    console.log('ID:', adminUser.id);
    console.log('\n✅ You can now login with:');
    console.log('   Email: admin@footballscout.ai');
    console.log('   Password: Admin@123');
  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed script
seedAdminUser();

