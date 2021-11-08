import formidable from "formidable";
import express from "express";
import yargs from "yargs";
import YAML from "yaml";
import fs from "fs";

const app = express();
// use pug for rendering html
app.set("view engine", "pug");

// parse args
const args = yargs(process.argv.slice(2))
  .usage("Usage: $0 [options]")
  .example("$0", "Start the app")
  .option("settings", {
    alias: "s",
    default: "./settings.yml",
    describe: "YAML file to load settings from",
    type: "string",
  })
  .command(
    "generate",
    "make a new config file",
    function (yargs) {
      return yargs.option("file", {
        alias: "f",
        describe: "where to save the file to",
        default: "settings.yml",
      });
    },
    function (yargs) {
      // generate new valid setting yaml here
      if (fs.existsSync(yargs.file)) {
        console.log("File already exists. Moving to old_" + yargs.file);
        fs.cpSync(yargs.file, "old_" + yargs.file);
        fs.writeFileSync(yargs.file, "password: YourPasswordHere\nport: 3000");
        console.log(
          "Successfully generated new config file.\nYour config is now:\n\n" +
            fs.readFileSync(yargs.file)
        );
        process.exit(0);
      }
    }
  )
  .help("h")
  .alias("h", "help")
  .version("version", "1.0").argv;

// parse settings.yml for settings
let settings;
try {
  settings = YAML.parse(fs.readFileSync(args.settings, "utf8"));
} catch (ENOENT) {
  throw new Error(
    "No settings file exists, try running `node " + args.$0 + " generate`"
  );
}
if (settings.password || settings.port === undefined) {
  throw new Error(
    "Invalid settings, make sure every required setting is defined"
  );
}

console.log("The password is: " + settings.password);

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
    if (fields.password[0] === settings.password) {
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

app.listen(settings.port, () => {
  console.log("Server listening on http://localhost:" + settings.port + " ...");
});
