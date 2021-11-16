const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yxq3j.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

app.get("/", (req, res) => {
    res.send("Wrish Watch server is running!");
});

async function run() {
    try {
        await client.connect();
        // console.log("mongodb connected");
        const database = client.db("WrishWatch");
        const watchCollection = database.collection("watches");
        const reviewCollection = database.collection("reviews");
        const ordersCollection = database.collection("orders");
        const usersCollection = database.collection("users");

        //get api for watches collection
        app.get("/watches/:count", async (req, res) => {
            let result;
            if (req.params.count === "all") {
                result = await watchCollection.find({}).toArray();
            } else {
                const count = parseInt(req.params.count);
                result = await watchCollection.find({}).limit(count).toArray();
            }
            res.json(result);
        });

        //add product api
        app.post("/watches", async (req, res) => {
            const product = req.body;
            const result = await watchCollection.insertOne(product);
            res.json(result);
        });

        //deleting products
        app.delete("/watches/:id", async (req, res) => {
            // const id = req.params.id;
            const query = { _id: ObjectId(req.params.id) };
            const result = await watchCollection.deleteOne(query);
            res.json(result);
        });

        //get api to get all reviews
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find({}).toArray();
            res.json(result);
        });

        // posting a review
        app.post("/reviews", async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.json(result);
        });

        //get api for single product
        app.get("/purchase/:id", async (req, res) => {
            const query = { _id: ObjectId(req.params.id) };

            const result = await watchCollection.findOne(query);

            res.json(result);
        });

        //get api for myorders
        app.get("/orders/:email", async (req, res) => {
            // console.log(req.body);
            const email = req.params.email;
            const query = { email: email };
            const result = await ordersCollection.find(query).toArray();
            res.json(result);
        });

        app.get("/manage/orders", async (req, res) => {
            const result = await ordersCollection.find({}).toArray();
            res.json(result);
        });

        //post api for recieving order
        app.post("/orders", async (req, res) => {
            // console.log(req.body);
            const doc = req.body;
            const result = await ordersCollection.insertOne(doc);
            res.json(result);
        });

        //updating status
        app.put("/orders/:id", async (req, res) => {
            const filter = { _id: ObjectId(req.params.id) };
            const updateDoc = {
                $set: {
                    status: true,
                },
            };
            const result = await ordersCollection.updateOne(filter, updateDoc);
            res.json(result);
        });

        //delete api for orders
        app.delete("/orders/:id", async (req, res) => {
            // const id = req.params.id;
            const query = { _id: ObjectId(req.params.id) };
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        });

        //to verify an user is admin or not
        app.get("/users/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await usersCollection.findOne(query);
            res.json(result);
        });

        app.post("/users", async (req, res) => {
            const user = req.body;
            // console.log(user);
            const result = await usersCollection.insertOne(user);
            res.json(result);
        });

        // put api for make an admin from existing users
        app.put("/users/admin", async (req, res) => {
            const email = req.body.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: "admin" },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`listening at port ${port}`);
});
