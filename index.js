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
