import formidable from 'formidable'
import express from 'express'
import yargs from 'yargs'
import YAML from 'yaml'
import fs from 'fs'
import { execSync } from 'child_process'

const app = express()
// use pug for rendering html
app.set('view engine', 'pug')

// parse args
const args = yargs(process.argv.slice(2))
  .usage('Usage: $0 [options]')
  .example('$0', 'Start the app')
  .option('settings', {
    alias: 's',
    default: 'settings.yml',
    describe: 'YAML file to load settings from',
    type: 'string'
  })
  .option('dry-run', {
    alias: 'd',
    default: false,
    describe: 'Write config to test-[interface].conf instead of actual WireGuard conf',
    type: 'boolean'
  })
  .command(
    'generate',
    'make a new config file',
    function (yargs) {
      return yargs.option('file', {
        alias: 'f',
        describe: 'where to save the file to',
        default: 'settings.yml'
      })
    },
    function (yargs) {
      // generate new valid settings yaml
      if (fs.existsSync(yargs.file)) {
        console.log('File already exists. Moving to old_' + yargs.file)
        fs.cpSync(yargs.file, 'old_' + yargs.file)
      }
      fs.writeFileSync(
        yargs.file,
        `password: YourPasswordHere # the user needs to know this to create a config
port: 3000 # where to expose the service (usually 80)
dns: 1.1.1.1 # set a custom dns here for pihole + etc.
# this allowedips ignores local network traffic, set to '0.0.0.0/0, ::/0' for routing all traffic
allowedips: ::/0, 1.0.0.0/8, 2.0.0.0/8, 3.0.0.0/8, 4.0.0.0/6, 8.0.0.0/7, 11.0.0.0/8, 12.0.0.0/6, 16.0.0.0/4, 32.0.0.0/3, 64.0.0.0/2, 128.0.0.0/3, 160.0.0.0/5, 168.0.0.0/6, 172.0.0.0/12, 172.32.0.0/11, 172.64.0.0/10, 172.128.0.0/9, 173.0.0.0/8, 174.0.0.0/7, 176.0.0.0/4, 192.0.0.0/9, 192.128.0.0/11, 192.160.0.0/13, 192.169.0.0/16, 192.170.0.0/15, 192.172.0.0/14, 192.176.0.0/12, 192.192.0.0/10, 193.0.0.0/8, 194.0.0.0/7, 196.0.0.0/6, 200.0.0.0/5, 208.0.0.0/4
subnet: 10.66.66.0 # what ip range to assign new configs, netmask 24 only
endpoint: 0.0.0.0:1234 # where your server is publicly accessible from the internet (with wireguard port)
interface: wg0 # the wireguard interface to use`
      )
      console.log(
        'Successfully generated new config file.\nYour config is now:\n\n' +
          fs.readFileSync(yargs.file)
      )
      process.exit(0)
    }
  )
  .help('h')
  .alias('h', 'help')
  .version('version', '1.0').argv

// parse settings.yml for settings
let settings
try {
  settings = YAML.parse(fs.readFileSync(args.settings).toString())
} catch (ENOENT) {
  throw new Error(
    'No settings file exists at ' + args.settings + ', try running `node ' + args.$0 + ' generate`'
  )
}
// make sure all needed settings are set (todo: check for correct types)
if ((settings.password || settings.port || settings.dns || settings.interface || settings.allowedips || settings.subnet || settings.endpoint) === undefined) {
  throw new Error(
    'Invalid settings, make sure every required setting is defined'
  )
}

console.log('The password is: ' + settings.password)

// render views/index.pug when / accessed
app.get('/', (req, res) => {
  res.render('index')
})

// set up POST endpoint at /submit
app.post('/submit', (req, res, next) => {
  const form = formidable({})

  form.parse(req, (err, fields) => {
    if (err) {
      next(err)
      return
    }
    if (fields.password[0] === settings.password) {
      // TODO: parse username and remove spaces/symbols
      // Actual Name -> actual-name-wg0.conf
      // finally, show the config here with download
      // and email it to them with mailgun or something
      // probably save all info in a db
      console.log(JSON.stringify(fields))
      console.log('Generating new peer config...')
      let generatedpkey
      generatedpkey = execSync('wg genkey').toString()
      let generatedpubkey
      generatedpubkey = execSync(
        "echo '" + generatedpkey + "' | wg pubkey"
      ).toString()
      let generatedpsk
      generatedpsk = execSync('wg genpsk').toString()
      let generateddns
      if (fields.dns === true) {
        generateddns = settings.dns
      } else {
        generateddns = '1.1.1.1'
      }
      let generatedaddress
      let wgconfig = fs.readFileSync('/etc/wireguard/' + settings.interface + '.conf', 'utf8')
      // find unused WireGuard peer IP
      let i
          for (i = 2; i < 255; i++) {
            if (wgconfig.includes(settings.subnet.toString().slice(0, -1) + i)) {
              console.log(settings.subnet.toString().slice(0, -1) + i + ' already taken')
            } else {
              generatedaddress = settings.subnet.toString().slice(0, -1) + i
              console.log(generatedaddress + ' is unused. Using it.')
              break
            }
          }
      // create config for user
      let userconfig = 'client-' + fields.username + '.conf'
      fs.writeFileSync(
        // TODO: convert username to lowercase string
        userconfig,
        '[Interface]' +
          '\nPrivateKey = ' +
          execSync('wg genkey').toString() +
          '\nAddress = ' +
          generatedaddress +
          '\nDNS = ' +
          generateddns +
          '\n[Peer]\nPublicKey = ' +
          execSync('wg show ' + settings.interface + ' public-key').toString() +
          '\nPresharedKey = ' +
          generatedpsk +
          '\nAllowedIPs =  ' +
          settings.allowedips +
          ', ' +
          settings.subnet +
          '/24, ' +
          settings.dns +
          '/32' +
          '\nEndpoint = ' +
          settings.endpoint
      )
      // save to test-[interface].conf on a dry run
      let saveto
      if (args.dryRun === true) {
        saveto =  'test-' + settings.interface + '.conf'
      } else {
        saveto = '/etc/wireguard/' + settings.interface + '.conf'
      }
      // add user to server config
      fs.appendFileSync(
        saveto,
        '### Client ' + fields.username +
        '\n[Peer]' +
        '\nPublicKey = ' +
        generatedpubkey +
        'PresharedKey = ' +
        generatedpsk +
        'AllowedIPs = ' +
        generatedaddress +
        '/32',
      )
      // ...and then we present it to the user.
      res.render('success', {
        form: JSON.stringify(fields),
        filedata: fs.readFileSync(userconfig, 'base64'),
        savename: userconfig
      })
    } else {
      res.render('fail')
      // should add rate limiting here or something
    }
  })
})
app.listen(settings.port, () => {
  console.log('Server listening on http://localhost:' + settings.port + ' ...')
})