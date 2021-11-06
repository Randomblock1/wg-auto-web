import formidable from "formidable";
import express from "express";

const app = express();
// use pug for rendering html
app.set("view engine", "pug");

// render views/index.pug when / accessed
app.get("/", (req, res) => {
  res.render("index");
});

// set up POST endpoint at /submit
app.post("/submit", (req, res, next) => {
  const form = formidable({});

  form.parse(req, (err, fields) => {
    if (err) {
      next(err);
      return;
    }
    // parse request here, currently just returns json
    // need to either accept or reject based on password
    // then generate vpn config
    // and finally preset it to the user
    res.render("success", {
      form: JSON.stringify(fields),
    });
  });
});

app.listen(3000, () => {
  console.log("Server listening on http://localhost:3000 ...");
});
