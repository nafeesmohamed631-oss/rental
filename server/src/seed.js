import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Product from './models/Product.js';

await connectDB();

const adminHashedPassword = await bcrypt.hash('Admin@123', 12);

// Ensure single admin account with email sudalai1234@gmail.com exists with admin role
await User.updateOne(
	{ email: 'sudalai1234@gmail.com' },
	{
		$set: {
			username: 'Sudalai Admin',
			email: 'sudalai1234@gmail.com',
			password: adminHashedPassword,
			role: 'admin'
		}
	},
	{ upsert: true }
);

const imgs = {
	Books: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f',
	Cameras: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32',
	Laptops: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853'
};
const names = [
	['Atomic Habits', 'Books', 40],
	['The Alchemist', 'Books', 35],
	['Engineering Mathematics', 'Books', 30],
	['Canon EOS 1500D', 'Cameras', 700],
	['Sony Alpha A6400', 'Cameras', 900],
	['Nikon D5600', 'Cameras', 800],
	['HP Pavilion 15', 'Laptops', 500],
	['Dell Inspiron 14', 'Laptops', 450],
	['Lenovo IdeaPad Slim 3', 'Laptops', 400]
];

if (await Product.countDocuments() === 0) {
	for (const [name, category, price] of names) {
		await Product.create({
			name,
			category,
			pricePerDay: price,
			image: imgs[category],
			description: `${name} for student rental. Flexible 1–7 day plans.`,
			condition: 'Excellent',
			location: 'Kovilpatti',
			availableFrom: new Date(),
			availableTo: new Date(Date.now() + 30 * 86400000),
			status: 'available'
		});
	}
}

console.log('Seed complete. Admin credentials set to sudalai1234@gmail.com.');
process.exit(0);
