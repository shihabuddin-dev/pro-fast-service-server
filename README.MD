# Pro Fast Service Server

Backend server for the Pro Fast Service parcel delivery platform.  
Developed by [Shihab Uddin](https://shihab-dev.web.app/) ([LinkedIn](https://www.linkedin.com/in/shihab-dev/)).

## Features

- User authentication with Firebase Admin
- Role-based access (admin, rider, user)
- Parcel management (CRUD, assignment, delivery tracking)
- Rider management (status, assignment, approval)
- Payment processing with Stripe
- MongoDB database integration
- RESTful API endpoints
- CORS and environment variable support

## Tech Stack

- Node.js
- Express.js
- MongoDB (with official driver)
- Firebase Admin SDK
- Stripe API
- dotenv
- CORS

## Getting Started

1. **Clone the repository**
   ```sh
   git clone <repo-url>
   cd pro-fast-service-server
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Set up environment variables**  
   Create a `.env` file with the following keys:
   ```
   MONGODB_URI=your_mongodb_uri
   PAYMENT_GATEWAY_KEY=your_stripe_secret_key
   FB_SERVICE_KEY=your_base64_encoded_firebase_admin_key
   ```

4. **Start the server**
   ```sh
   npm run dev
   ```
   The server will run on [http://localhost:3000](http://localhost:3000) by default.

## API Endpoints

- `POST /users` — Register a new user
- `GET /users/search` — Search users by email
- `GET /users/:email/role` — Get user role
- `PATCH /users/:id/role` — Update user role (admin only)
- `GET /parcels` — List parcels (with filters)
- `POST /parcels` — Create a new parcel
- `PATCH /parcels/:id/assign` — Assign a rider to a parcel
- `PATCH /parcels/:id/status` — Update parcel delivery status
- `GET /rider/parcels` — Get rider's assigned parcels
- `GET /rider/completed-parcels` — Get rider's completed deliveries
- `POST /payments` — Record a payment
- `POST /create-payment-intent` — Create Stripe payment intent

See [`index.js`](index.js) for full API details.

## Deployment

- Ready for deployment on [Vercel](https://vercel.com/) (see `vercel.json`).

## License

ISC

---

**Developer:** [Shihab Uddin](https://shihab-dev.web.app/)  
[LinkedIn](https://www.linkedin.com/in/shihab-dev/)
