const express = require("express");
const { MongoClient, ServerApiVersion } = require("mongodb");
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

    // post parcel
    app.post('/parcels', async (req, res) => {
      const newParcel = req.body;
      const result = await parcelCollection.insertOne(newParcel)
      res.send(result)
    })


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
