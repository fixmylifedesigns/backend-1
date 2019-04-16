const router = require("express").Router();
const bcrypt = require("bcryptjs");
const restrict = require("../auth/restrict.js");

const Accounts = require("./model.js");
const generateToken = require("../auth/generateToken.js");

router.get("/", async (req, res) => {
  try {
    const accounts = await Accounts.getAccounts();
    res.status(200).json({ accounts });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error getting accounts" });
  }
});

router.put("/", restrict, async ({ decoded: { id, username }, body }, res) => {
  delete body.token;
  console.log(body);
  if (Object.keys(body).length) {
    try {
      const updated = await Accounts.update(id, body);
      res.status(200).json(updated);
    } catch (err) {
      console.log(err);
      res
        .status(500)
        .json({ message: "Internal server error: updating account" });
    }
  } else {
    console.log("Update w/ no data");
    res.status(400).json({ message: "Please include data to update" });
  }
});

router.post(
  "/register",
  async ({ body: { username, password, avatar } }, res) => {
    if (username && password) {
      try {
        const creditials = {
          username,
          password: bcrypt.hashSync(password, 12)
        };
        creditials.avatar = avatar ? avatar : "https://bit.ly/2GlN9TU";

        const newAccount = await Accounts.insert(creditials);
        const token = await _getLoginToken(newAccount.username);
        res.status(201).json({ ...newAccount, token });
      } catch (err) {
        console.log(err);
        res
          .status(500)
          .json({ message: "Internal server error: registering account" });
      }
    } else {
      console.log("Bad account creation");
      res.status(400).json({ message: "Please include username & password" });
    }
  }
);

router.post("/login", async ({ body: { username, password } }, res) => {
  if (username && password) {
    try {
      const account = await Accounts.findBy({ username }).first();
      if (account && bcrypt.compareSync(password, account.password)) {
        const token = await _getLoginToken(account.username);
        res.status(200).json({ token });
      } else {
        console.log("Bad login");
        res.status(400).json({ message: "Invalid creditials" });
      }
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: "Internal server error: logging in" });
    }
  } else {
    console.log("Missing username/password");
    res.status(400).json({ message: "Please include a username & password" });
  }
});

async function _getLoginToken(username) {
  try {
    const { id } = await Accounts.findBy({ username }).first();
    return generateToken({ username, id }, "1d");
  } catch (err) {
    console.log(err);
  }
}

module.exports = router;
