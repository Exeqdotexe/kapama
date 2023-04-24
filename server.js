const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");

const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));
app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "kapamajs",
});

router.get('/update-product/:id', ensureAuthenticated, (req, res) => {
  const productId = req.params.id;
  const userId = req.user.id;
  const query = 'SELECT * FROM products WHERE id = ? AND user_id = ?';
  
  db.query(query, [productId, userId], (err, result) => {
    if (err) throw err;
    res.render('update-product', { product: result[0] });
  });
});

router.post('/update-product', ensureAuthenticated, (req, res) => {
  const { id, name, quantity } = req.body;
  const userId = req.user.id;
  const query = 'UPDATE products SET name = ?, quantity = ? WHERE id = ? AND user_id = ?';
  
  db.query(query, [name, quantity, id, userId], (err, result) => {
    if (err) throw err;
    req.flash('success_msg', 'Product updated successfully');
    res.redirect('/products');
  });
});


connection.connect();

app.use(
  session({
    secret: "your_secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy((username, password, done) => {
    connection.query(
      "SELECT * FROM users WHERE username = ?",
      [username],
      (error, results) => {
        if (error) return done(error);

        if (results.length === 0) {
          return done(null, false, { message: "Incorrect username." });
        }

        const user = results[0];

        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password." });
        }

        return done(null, user);
      }
    );
  })
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  connection.query("SELECT * FROM users WHERE id = ?", [id], (error, results) => {
    if (error) return done(error);

    return done(null, results[0]);
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

function ensureAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.is_admin) {
    return next();
  }
  res.redirect("/login");
}

app.get("/", ensureAuthenticated, (req, res) => {
  res.render("index", { user: req.user });
});

app.get("/login", (req, res) => {
  res.render("login");
});



app.post("/login", passport.authenticate("local", { successRedirect: "/", failureRedirect: "/login" }));

app.get("/logout", function (req, res, next) {
  req.logout(function (error) {
    if (error) {
      return next(error);
    }
    res.redirect("/");
  });
});

// Ürün güncelleme formunu gösterme
app.get('/update-product/:id', ensureAuthenticated, (req, res) => {
  const productId = req.params.id;
  connection.query('SELECT * FROM products WHERE id = ?', [productId], (error, results) => {
    if (error) throw error;

    if (results.length === 0) {
      res.status(404).send('Product not found');
    } else {
      res.render('update-product', { product: results[0] });
    }
  });
});

// Ürün güncellemelerini veritabanına kaydetme
app.post('/update-product/:id', ensureAuthenticated, (req, res) => {
  const productId = req.params.id;
  const { name, description } = req.body;
  connection.query('UPDATE products SET name = ?, description = ? WHERE id = ?', [name, description, productId], (error, results) => {
    if (error) throw error;

    res.redirect('/products');
  });
});

app.get('/update-product/:id', ensureAuthenticated, (req, res) => {
  let productId = req.params.id;
  let query = "SELECT * FROM `products` WHERE `id` = ?";
  
  connection.query(query, [productId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Database error.");
    }
    
    res.render('update_quantity', { product: result[0] });
  });
});


app.get("/add-product", ensureAuthenticated, (req, res) => {
  res.render("add-product", { user: req.user });
});

app.post("/add-product", ensureAuthenticated, (req, res) => {
  const { product_id, product_quantity } = req.body;
  connection.query(
    "INSERT INTO product_movements (user_id, product_id, product_quantity) VALUES (?, ?, ?)",
    [req.user.id, product_id, product_quantity],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.redirect("/add-product");
      }
      res.redirect("/");
    }
  );
});

app.get("/product-movements", ensureAdmin, (req, res) => {
  connection.query(
    "SELECT * FROM product_movements INNER JOIN users ON product_movements.user_id = users.id",
    (error, results) => {
      if (error) {
        console.error(error);
        return res.redirect("/");
      }
      res.render("product-movements", { user: req.user, movements: results });
    }
  );
});

//...

// Yeni sayfaların yönlendirme işlemleri için bu kodları ekleyin:
app.get("/add-product-admin", ensureAdmin, (req, res) => {
  res.render("add-product-admin", { user: req.user });
});

app.post("/add-product-admin", ensureAdmin, (req, res) => {
  const { product_name } = req.body;
  connection.query(
    "INSERT INTO products (name) VALUES (?)",
    [product_name],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.redirect("/add-product-admin");
      }
      res.redirect("/add-product-admin");
    }
  );
});

app.get("/assign-stages", ensureAdmin, (req, res) => {
  connection.query("SELECT * FROM products", (error, products) => {
    if (error) {
      console.error(error);
      return res.redirect("/");
    }
    connection.query("SELECT * FROM users", (error, users) => {
      if (error) {
        console.error(error);
        return res.redirect("/");
      }
      res.render("assign-stages", { user: req.user, products: products, users: users });
    });
  });
});

app.post("/assign-stages", ensureAdmin, (req, res) => {
  const { product_id, user_id, stage } = req.body;
  connection.query(
    "INSERT INTO product_stages (product_id, user_id, stage) VALUES (?, ?, ?)",
    [product_id, user_id, stage],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.redirect("/assign-stages");
      }
      res.redirect("/assign-stages");
    }
  );
});

app.get("/my-products", ensureAuthenticated, (req, res) => {
  connection.query(
    "SELECT products.name as product_name, product_stages.stage as stage FROM product_stages INNER JOIN products ON product_stages.product_id = products.id WHERE product_stages.user_id = ?",
    [req.user.id],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.redirect("/");
      }
      res.render("my-products", { user: req.user, products: results });
    }
  );
});

app.get('/update-product/:id', ensureAuthenticated, (req, res) => {
  let productId = req.params.id;
  let query = "SELECT * FROM `products` WHERE `id` = ?";
  
  connection.query(query, [productId], (err, result) => {
    if (err) {
      console.log(err);
      return res.status(500).send("Database error.");
    }
    
    res.render('update_quantity', { product: result[0] });
  });
});


app.post("/update-product/:id", ensureAuthenticated, (req, res) => {
  const productId = req.params.id;
  const { product_quantity } = req.body;
  connection.query(
    "INSERT INTO product_movements (user_id, product_id, product_quantity) VALUES (?, ?, ?)",
    [req.user.id, productId, product_quantity],
    (error, results) => {
      if (error) {
        console.error(error);
        return res.redirect(`/update-product/${productId}`);
      }
      res.redirect("/my-products");
    }
  );
});

//...


app.listen(3000, () => {
  console.log("Server is running on port 3000");
});