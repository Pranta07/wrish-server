const express = require("express");
require("dotenv").config();
const cors = require("cors");
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const admin = require("firebase-admin");
const fileUpload = require("express-fileupload");

//require("./wrish-firebase-adminsdk.json")
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());
app.use(fileUpload());

app.get("/", (req, res) => {
    res.send("Wrish Watch server is running!");
});

const stripe = require("stripe")(`${process.env.STRIPE_SECRET}`);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yxq3j.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
    // console.log(req.headers.authorization);
    if (req.headers?.authorization?.startsWith("Bearer ")) {
        const token = req.headers.authorization.split(" ")[1];
        // console.log(token);

        try {
            await admin
                .auth()
                .verifyIdToken(token)
                .then((decodedUser) => {
                    req.decodedEmail = decodedUser.email;
                    // console.log(decodedToken);
                })
                .catch((error) => {
                    // Handle error
                });
        } catch {
            console.log("error khaise");
        }
    }
    next();
}

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
        app.get("/watches", async (req, res) => {
            const page = req.query.page;
            const productCount = req.query.productCount;
            const cursor = watchCollection.find({});
            const count = await cursor.count();

            const products = await cursor
                .skip((page - 1) * productCount)
                .limit(productCount)
                .toArray();

            res.json({ count, products });
        });

        //add product api
        app.post("/watches", async (req, res) => {
            const product = req.body;
            const file = req.files;
            // console.log(product, file);
            const imgData = req.files.img.data;
            const encodedData = imgData.toString("base64");
            const imgBuffer = Buffer.from(encodedData, "base64");

            product.img = imgBuffer;
            // console.log(product);
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
            const email = req.params.email;
            const query = { email: email };

            const page = parseInt(req.query.page);
            const rows = parseInt(req.query.rows);
            const result = await ordersCollection
                .find(query)
                .skip(page * rows)
                .limit(rows)
                .toArray();

            const count = await ordersCollection.find(query).count();
            res.json({ count, products: result });
        });

        //get api for a specific order
        app.get("/pay/:id", async (req, res) => {
            // const id = req.params.id;
            const query = { _id: ObjectId(req.params.id) };
            const result = await ordersCollection.findOne(query);
            res.json(result);
        });

        app.get("/manage/orders", async (req, res) => {
            const page = parseInt(req.query.page);
            const rows = parseInt(req.query.rows);

            const result = await ordersCollection
                .find({})
                .skip(page * rows)
                .limit(rows)
                .toArray();

            const count = await ordersCollection.find({}).count();
            res.json({ count, orders: result });
        });

        //post api for recieving order
        app.post("/orders", async (req, res) => {
            // console.log(req.body);
            const doc = req.body;
            const result = await ordersCollection.insertOne(doc);
            res.json(result);
        });

        //updating shipping status
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

        //updating payment status
        app.put("/pay/orders/:id", async (req, res) => {
            const payment = req.body;
            const filter = { _id: ObjectId(req.params.id) };
            const updateDoc = {
                $set: {
                    payment: payment,
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
        app.put("/users/admin", verifyToken, async (req, res) => {
            //const token = req.headers.authorization.split("Bearer ")[1];
            //console.log(token);
            // console.log(req.decodedEmail);
            const requesterEmail = req.decodedEmail;
            if (requesterEmail) {
                const query = { email: requesterEmail };
                const requester = await usersCollection.findOne(query);
                if (requester.role === "admin") {
                    const email = req.body.email;
                    const filter = { email: email };
                    const updateDoc = {
                        $set: { role: "admin" },
                    };
                    const result = await usersCollection.updateOne(
                        filter,
                        updateDoc
                    );
                    res.send(result);
                }
            } else {
                res.status(403).json({
                    message: "You do not have access to make an admin.",
                });
            }
        });

        //api for payment
        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`listening at port ${port}`);
});
