const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const MongoDBSession = require("connect-mongodb-session")(session);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 5000;

// middleWere
app.use(cors());
app.use(express.json());

// console.log(process.env.DB_USER, process.env.DB_PASSWORD);
const mongodURI = "mongodb://localhost:5000/session";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@mamunlm10.47xczn4.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const store = new MongoDBSession({
  uri: uri,
  collection: "mySessions",
});

app.use(
  session({
    secret: "key that will sign cookie",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

const isAuth = (req, res, next) => {
  if (req.session.isAuth) {
    next();
  } else {
    res.redirect("/login");
  }
};

async function run() {
  try {
    const usersCollection = client.db("power-hack").collection("users");
    const billingCollection = client.db("power-hack").collection("billing");

    // authentication
    app.get("/registration", async (req, res) => {
      res.send({ registration: "/registration" });
    });
    app.post("/registration", async (req, res) => {
      const { name, email, password } = req.body;
      let user = await usersCollection.findOne({ email });
      if (user) {
        return res.status(403).send("Already Registered");
      } else {
        const hashedPsw = await bcrypt.hash(password, 12);
        user = {
          name,
          email,
          password: hashedPsw,
        };
        const result = await usersCollection.insertOne(user);
        res.send(result);
      }
    });

    app.get("/login", async (req, res) => {
      res.send({ login: "Login Successful" });
    });
    app.post("/login", async (req, res) => {
      const { email, password } = req.body;
      const user = await usersCollection.findOne({ email });
      if (!user) {
        return res.redirect("/login");
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.redirect("/register");
      }
      req.session.isAuth = true;
      res.redirect("/login");
    });

    // Billing

    app.post("/add-billing", async (req, res) => {
      const billing = req.body;
      const result = await billingCollection.insertOne(billing);
      res.send(result);
    });

    app.get("/billing-list", async (req, res) => {
      const page = parseInt(req.query.page);
      console.log(req.query);
      let query = {};
      const search = req.query.search;
      console.log(search);
      if (search.length) {
        query = {
          $text: {
            $search: search,
          },
        };
      }
      // const options = {
      //   sort: { billingDate: -1 },
      // };
      // const cursor = billingCollection.find(query, options);
      const cursor = billingCollection.find(query).sort({ billingDate: -1 });
      const data = await cursor
        .skip(page * 10)
        .limit(10)
        .toArray();
      const count = await billingCollection.estimatedDocumentCount();
      res.send({ count, data });
    });

    app.put("/update-billing/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const update = req.body;
      const option = { upsert: true };
      const updatedBill = {
        $set: {
          name: update.name,
          email: update.email,
          phone: update.phone,
          paidAmount: update.paidAmount,
        },
      };
      const result = await billingCollection.updateOne(
        filter,
        updatedBill,
        option
      );
      res.send(result);
    });

    app.delete("/delete-billing/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await billingCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch((err) => console.error(err));

app.get("/", async (req, res) => {
  req.session.isAuth = true;
  res.send("Power Hack server is running");
});

app.listen(port, () =>
  console.log(`Power Hack server running in  port: ${port}`)
);
