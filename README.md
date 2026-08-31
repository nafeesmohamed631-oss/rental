# SmartRent — MERN Rental Management Portal

## Stack
React + Vite, Express, MongoDB/Mongoose, JWT, Axios, Lucide React.

## Features
- Modern responsive Browse Dashboard (no product navbar clutter)
- Books, Cameras, Laptops — 3 products each
- Every product supports 1/2/3/4/5/6/7 day rental choices
- Dynamic search/category filtering with React useState/useEffect/useMemo
- Product detail → demo payment page → mobile number → UPI-formatted demo ID → admin rental request
- Admin dashboard with product create/edit/update/delete and rental accept/reject/return
- Admin can change product availability dates and details
- JWT authentication and role protection
- MongoDB persistence

## Setup
1. Install MongoDB locally or create a MongoDB Atlas cluster.
2. `cd server && npm install`
3. Copy `.env.example` to `.env` and set `MONGO_URI`.
4. `npm run seed && npm run dev`
5. In another terminal: `cd client && npm install && npm run dev`
6. Open `http://localhost:5173`

`npm run seed` is safe to run again: it only creates missing default data and preserves registered accounts, rentals, and product changes. The MongoDB database stores those records independently of the client session and server restart.

Seed admin: `admin@smartrent.local` / `Admin@123`

Payment is intentionally a demo UPI-formatted identifier and does not process real money.

## EmailJS notifications

Copy `client/.env.example` to `client/.env` and set the EmailJS Service ID, Template ID, and admin email. The public key is already included. The EmailJS template must use `{{to_email}}` as its recipient and can use `{{to_name}}`, `{{subject}}`, `{{status}}`, `{{rental_id}}`, `{{product_name}}`, `{{rental_days}}`, `{{total_amount}}`, `{{start_date}}`, `{{end_date}}`, `{{mobile}}`, and `{{message}}`.

Notifications are sent when a rental request is created, approved, rejected, returned, or has its damage report updated. Email delivery errors do not cancel a successfully saved rental action.
