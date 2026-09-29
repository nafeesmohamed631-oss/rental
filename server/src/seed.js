import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Product from './models/Product.js';

await connectDB();

const hashPassword = async (pwd) => await bcrypt.hash(pwd, 12);

// 1. Seed Single Designated Admin Accounts
const adminUsers = [
  {
    username: 'Admin',
    email: 'admin@gmail.com',
    password: await hashPassword('Admin@123'),
    role: 'admin',
  },
  {
    username: 'Admin Local',
    email: 'admin@smartrent.local',
    password: await hashPassword('Admin@123'),
    role: 'admin',
  },
];

for (const admin of adminUsers) {
  await User.updateOne(
    { email: admin.email },
    { $set: { username: admin.username, password: admin.password, role: 'admin' } },
    { upsert: true }
  );
}

// 2. Seed 4 Students (Roles: user)
const students = [
  {
    username: 'Student 1',
    email: 'student1@gmail.com',
    password: await hashPassword('Student@123'),
    role: 'user',
  },
  {
    username: 'Student 2',
    email: 'student2@gmail.com',
    password: await hashPassword('Student@123'),
    role: 'user',
  },
  {
    username: 'Student 3',
    email: 'student3@gmail.com',
    password: await hashPassword('Student@123'),
    role: 'user',
  },
  {
    username: 'Student 4',
    email: 'student4@gmail.com',
    password: await hashPassword('Student@123'),
    role: 'user',
  },
];

for (const student of students) {
  await User.updateOne(
    { email: student.email },
    { $set: { username: student.username, password: student.password, role: 'user' } },
    { upsert: true }
  );
}

// 3. Seed Products Posted by Students
const studentProducts = [
  {
    name: 'Atomic Habits',
    category: 'Books',
    pricePerDay: 40,
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f',
    description: 'Bestselling self-improvement book in pristine condition. Great for exam break reading.',
    condition: 'Excellent',
    location: 'Campus Library / Hostel A',
    postedBy: 'Student 1',
    ownerEmail: 'student1@gmail.com',
    status: 'available',
  },
  {
    name: 'The Alchemist',
    category: 'Books',
    pricePerDay: 35,
    image: 'https://images.unsplash.com/photo-1512820790803-83ca734da794',
    description: 'Inspiring fiction novel. Clean pages, no highlights.',
    condition: 'Like New',
    location: 'Campus Block B',
    postedBy: 'Student 2',
    ownerEmail: 'student2@gmail.com',
    status: 'available',
  },
  {
    name: 'Engineering Mathematics',
    category: 'Books',
    pricePerDay: 30,
    image: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777f',
    description: 'Comprehensive engineering math reference book. Semester ready.',
    condition: 'Good',
    location: 'Hostel Block C',
    postedBy: 'Student 3',
    ownerEmail: 'student3@gmail.com',
    status: 'available',
  },
  {
    name: 'Canon EOS 1500D DSLR',
    category: 'Cameras',
    pricePerDay: 700,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32',
    description: '24.1MP DSLR with 18-55mm lens, battery, and 64GB high-speed SD card included.',
    condition: 'Excellent',
    location: 'Media Lab / Main Campus',
    postedBy: 'Student 1',
    ownerEmail: 'student1@gmail.com',
    status: 'available',
  },
  {
    name: 'Sony Alpha A6400 4K',
    category: 'Cameras',
    pricePerDay: 900,
    image: 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd',
    description: 'Mirrorless 4K camera with lightning fast autofocus. Perfect for video projects and events.',
    condition: 'Like New',
    location: 'Tech Studio / Kovilpatti',
    postedBy: 'Student 3',
    ownerEmail: 'student3@gmail.com',
    status: 'available',
  },
  {
    name: 'Nikon D5600 Kit',
    category: 'Cameras',
    pricePerDay: 800,
    image: 'https://images.unsplash.com/photo-1512790182412-b19e6d62bc39',
    description: 'Touchscreen DSLR with extra battery and carrying bag. Great for weekend photography.',
    condition: 'Excellent',
    location: 'Department of Design',
    postedBy: 'Student 4',
    ownerEmail: 'student4@gmail.com',
    status: 'available',
  },
  {
    name: 'HP Pavilion 15 (Ryzen 7)',
    category: 'Laptops',
    pricePerDay: 500,
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853',
    description: '16GB RAM, 512GB SSD, Windows 11. Loaded with coding and engineering tools.',
    condition: 'Excellent',
    location: 'Hostel A - Room 204',
    postedBy: 'Student 2',
    ownerEmail: 'student2@gmail.com',
    status: 'available',
  },
  {
    name: 'Dell Inspiron 14 Core i5',
    category: 'Laptops',
    pricePerDay: 450,
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed',
    description: 'Slim lightweight laptop, 8-hour battery life. Perfect for study presentations.',
    condition: 'Good',
    location: 'Hostel B - Room 112',
    postedBy: 'Student 4',
    ownerEmail: 'student4@gmail.com',
    status: 'available',
  },
  {
    name: 'Lenovo IdeaPad Slim 3',
    category: 'Laptops',
    pricePerDay: 400,
    image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302',
    description: 'FHD display, fast SSD, charger included. Great daily driver for assignments.',
    condition: 'Excellent',
    location: 'Student Center Lounge',
    postedBy: 'Student 1',
    ownerEmail: 'student1@gmail.com',
    status: 'available',
  },
];

for (const p of studentProducts) {
  await Product.updateOne(
    { name: p.name },
    {
      $set: {
        category: p.category,
        pricePerDay: p.pricePerDay,
        image: p.image,
        description: p.description,
        condition: p.condition,
        location: p.location,
        postedBy: p.postedBy,
        ownerEmail: p.ownerEmail,
        status: p.status,
        availableFrom: new Date(),
        availableTo: new Date(Date.now() + 60 * 86400000),
      },
    },
    { upsert: true }
  );
}

console.log('✅ Seeding complete: 1 Admin, 4 Students, and student products populated successfully.');
process.exit(0);
