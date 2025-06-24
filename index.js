const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

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
    const parcelCollection = db.collection('parcels')

    // get all parcel
    app.get('/parcels', async (req, res) => {
      const result = await parcelCollection.find().toArray()
      res.send(result)
    })

    // parcels api
    // GET: All parcels OR parcels by user (created_by), sorted by latest
    app.get('/parcels', async (req, res) => {
      try {
        const userEmail = req.query.email;

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
