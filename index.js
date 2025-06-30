const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;
const admin = require("firebase-admin");

const stripe = require("stripe")(process.env.PAYMENT_GATEWAY_KEY);

// Middleware
app.use(cors());
app.use(express.json());

// firebase admin
const serviceAccount = require("./firebase-admin-key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


// mongoDB
const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db('parcelDB')
    const usersCollection = db.collection('users')
    const parcelCollection = db.collection('parcels')
    const paymentsCollection = db.collection('payments')
    const ridersCollection = db.collection('riders')

    // custom middleware
    const verifyFBToken = async (req, res, next) => {
      const authHeader = req.headers.authorization
      if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized Access' })
      }
      const token = authHeader.split(' ')[1]
      if (!token) {

        return res.status(401).send({ message: 'UnAuthorized Access' })
      }

      // varify the token
      try {
        const decoded = await admin.auth().verifyIdToken(token)
        req.decoded = decoded;
        next()
      } catch (error) {
        return res.status(403).send({ message: 'forbidden access' })
      }
    }


    app.get('/users', async (req, res) => {
      res.send(await usersCollection.find().toArray())
    })
    // users related api
    app.post('/users', async (req, res) => {
      const email = req.body.email;
      const userExists = await usersCollection.findOne({ email })
      if (userExists) {
        return res.status(200).send({ message: 'user alresdy exists', inserted: false })
      }
      const user = req.body;
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })


    // parcels api
    // GET: All parcels OR parcels by user (created_by), sorted by latest
    app.get('/parcels', verifyFBToken, async (req, res) => {
      try {
        const userEmail = req.query.email;
        console.log('decoded', req.decoded)
        if (req.decoded.email !== userEmail) {
          return res.status(403).send({ message: 'forbidden access' })
        }

        const query = userEmail ? { created_by: userEmail } : {};
        const options = {
          sort: { createdAt: -1 }, // Newest first
        };

        const parcels = await parcelCollection.find(query, options).toArray();
        res.send(parcels);
      } catch (error) {
        console.error('Error fetching parcels:', error);
        res.status(500).send({ message: 'Failed to get parcels' });
      }
    });

    // GET: Get a specific parcel by ID
    app.get('/parcels/:id', async (req, res) => {
      try {
        const id = req.params.id;

        const parcel = await parcelCollection.findOne({ _id: new ObjectId(id) });

        if (!parcel) {
          return res.status(404).send({ message: 'Parcel not found' });
        }

        res.send(parcel);
      } catch (error) {
        console.error('Error fetching parcel:', error);
        res.status(500).send({ message: 'Failed to fetch parcel' });
      }
    });

    // post parcel
    app.post('/parcels', async (req, res) => {
      const newParcel = req.body;
      const result = await parcelCollection.insertOne(newParcel)
      res.send(result)
    })

    // delete parcel data
    app.delete('/parcels/:id', async (req, res) => {
      try {
        const id = req.params.id;

        const result = await parcelCollection.deleteOne({ _id: new ObjectId(id) });

        res.send(result);
      } catch (error) {
        console.error('Error deleting parcel:', error);
        res.status(500).send({ message: 'Failed to delete parcel' });
      }
    });

    app.post("/tracking", async (req, res) => {
      const { tracking_id, parcel_id, status, message, updated_by = '' } = req.body;

      const log = {
        tracking_id,
        parcel_id: parcel_id ? new ObjectId(parcel_id) : undefined,
        status,
        message,
        time: new Date(),
        updated_by,
      };

      const result = await trackingCollection.insertOne(log);
      res.send({ success: true, insertedId: result.insertedId });
    });


    // getting payments info

    app.get('/payments', async (req, res) => {
      try {
        const userEmail = req.query.email;

        const query = userEmail ? { email: userEmail } : {};
        const options = { sort: { paid_at: -1 } }; // Latest first

        const payments = await paymentsCollection.find(query, options).toArray();
        res.send(payments);
      } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).send({ message: 'Failed to get payments' });
      }
    });

    // POST: Record payment and update parcel status
    app.post('/payments', async (req, res) => {
      try {
        const { parcelId, email, amount, paymentMethod, transactionId } = req.body;

        // 1. Update parcel's payment_status
        const updateResult = await parcelCollection.updateOne(
          { _id: new ObjectId(parcelId) },
          {
            $set: {
              payment_status: 'paid'
            }
          }
        );

        if (updateResult.modifiedCount === 0) {
          return res.status(404).send({ message: 'Parcel not found or already paid' });
        }

        // 2. Insert payment record
        const paymentDoc = {
          parcelId,
          email,
          amount,
          paymentMethod,
          transactionId,
          paid_at_string: new Date().toISOString(),
          paid_at: new Date(),
        };

        const paymentResult = await paymentsCollection.insertOne(paymentDoc);

        res.status(201).send({
          message: 'Payment recorded and parcel marked as paid',
          insertedId: paymentResult.insertedId,
        });

      } catch (error) {
        console.error('Payment processing failed:', error);
        res.status(500).send({ message: 'Failed to record payment' });
      }
    });


    app.post('/create-payment-intent', async (req, res) => {
      const amountInCents = req.body.amountInCents
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInCents, // Amount in cents
          currency: 'usd',
          payment_method_types: ['card'],
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });


    // rider info 
    // app.get('/riders', async (req, res) => {
    //   const result = await ridersCollection.find().toArray()
    //   res.send(result)
    // })
    app.post('/riders', async (req, res) => {
      const rider = req.body;
      const result = await ridersCollection.insertOne(rider)
      res.send(result)
    })

    app.get("/riders/pending", async (req, res) => {
      try {
        const pendingRiders = await ridersCollection
          .find({ status: "pending" })
          .toArray();

        res.send(pendingRiders);
      } catch (error) {
        console.error("Failed to load pending riders:", error);
        res.status(500).send({ message: "Failed to load pending riders" });
      }
    });

    app.get("/riders/active", async (req, res) => {
      const result = await ridersCollection.find({ status: "active" }).toArray();
      res.send(result);
    });

    app.patch("/riders/:id/status", async (req, res) => {
      const { id } = req.params;
      const { status } = req.body;
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set:
        {
          status
        }
      }

      try {
        const result = await ridersCollection.updateOne(
          query, updateDoc

        );
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to update rider status" });
      }
    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("That's great! Server is running");
});

app.listen(port, (req, res) => {
  console.log(`Server is running on port http://localhost:${port}`);
});
