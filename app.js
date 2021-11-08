import formidable from "formidable";
import express from "express";
import yargs from "yargs";

const app = express();
// use pug for rendering html
app.set("view engine", "pug");

// parse args for now, should eventually use a settings json file
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
      // TODO: Actual backend functionality
      // Actual Name -> actual-name-wg0.conf
      // find what 10.66.66.0/24 ip isn't being used
      // use different dns if user wants adblock
      // finally, show the config here with download
      // and email it to them with mailgun or something
      // probably save all info in a db
      // checkout wireguard-tools package for generation
      // also see https://www.reddit.com/r/WireGuard/comments/fxcqaa/script_automate_adding_wireguard_peers_on/
      console.log(JSON.stringify(fields));
      console.log("Generating new peer config...");
      // ...and then we present it to the user.
      res.render("success", {
        form: JSON.stringify(fields),
      });
    } else {
      res.render("fail");
      // should add rate limiting here or something
    }
  });
});

app.listen(3000, () => {
  console.log("Server listening on http://localhost:3000 ...");
});
