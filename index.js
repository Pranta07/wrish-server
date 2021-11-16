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

        //get api to get all reviews
        app.get("/reviews", async (req, res) => {
            const result = await reviewCollection.find({}).toArray();
            res.json(result);
        });

        //get api for single product
        app.get("/purchase/:id", async (req, res) => {
            const query = { _id: ObjectId(req.params.id) };

            const result = await watchCollection.findOne(query);

            res.json(result);
        });

        //post api for recieving order
        app.post("/orders", async (req, res) => {
            // console.log(req.body);
            const doc = req.body;
            const result = await ordersCollection.insertOne(doc);
            res.json(result);
        });
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`listening at port ${port}`);
});
