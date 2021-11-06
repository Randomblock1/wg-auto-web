import formidable from "formidable";
import express from "express";
import yargs from "yargs";

const app = express();
// use pug for rendering html
app.set("view engine", "pug");

var argv = yargs(process.argv.slice(2))
  .usage("Usage: $0 <password> [options]")
  .command("<password>", "Specify the password for the application")
  .example(
    "$0 SecretPassword",
    "Start the app with SecretPassword as the password"
  )
  .help("h")
  .alias("h", "help")
  .version("version", "1.0")
  .demandCommand(1).argv;

var password = argv._[0];
console.log("The password is: " + password);

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
    if (fields.password[0] === password) {
      res.render("success", {
        form: JSON.stringify(fields),
        // Actual Name -> actual-name-wg0.conf
        // find what 10.66.66.0/24 ip isn't being used, and use that
        // use different dns if user wants adblock
        // finally, show the config here with download
        // and email it to them
      });
    }
    else {
      res.render("fail")
    }
  });
});

app.listen(3000, () => {
  console.log("Server listening on http://localhost:3000 ...");
});
