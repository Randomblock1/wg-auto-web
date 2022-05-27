import formidable from 'formidable'
import express from 'express'
import yargs from 'yargs'
import YAML from 'yaml'
import fs from 'fs'
import { execSync } from 'child_process'
import sanitize from 'sanitize-filename'

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
    describe:
      'Write config to test-[interface].conf instead of actual WireGuard conf',
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
port: 3000 # where to expose the webpage
dns: 1.1.1.1 # set a custom dns here for PiHole & etc.
# this allowedIps ignores local network traffic, set to '0.0.0.0/0, ::/0' for routing all traffic
allowedIps: ::/0, 1.0.0.0/8, 2.0.0.0/8, 3.0.0.0/8, 4.0.0.0/6, 8.0.0.0/7, 11.0.0.0/8, 12.0.0.0/6, 16.0.0.0/4, 32.0.0.0/3, 64.0.0.0/2, 128.0.0.0/3, 160.0.0.0/5, 168.0.0.0/6, 172.0.0.0/12, 172.32.0.0/11, 172.64.0.0/10, 172.128.0.0/9, 173.0.0.0/8, 174.0.0.0/7, 176.0.0.0/4, 192.0.0.0/9, 192.128.0.0/11, 192.160.0.0/13, 192.169.0.0/16, 192.170.0.0/15, 192.172.0.0/14, 192.176.0.0/12, 192.192.0.0/10, 193.0.0.0/8, 194.0.0.0/7, 196.0.0.0/6, 200.0.0.0/5, 208.0.0.0/4
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
    'No settings file exists at ' +
    args.settings +
    ', try running `node ' +
    args.$0 +
    ' generate`'
  )
}
// make sure all needed settings are set (todo: check for correct types)
if (
  (settings.password ||
    settings.port ||
    settings.dns ||
    settings.interface ||
    settings.allowedIps ||
    settings.subnet ||
    settings.endpoint) === undefined
) {
  throw new Error(
    'Invalid settings, make sure every required setting is defined'
  )
}

console.log('The password is: ' + settings.password)

// render views when accessed
app.get('/', (req, res) => {
  res.render('index')
})

app.get('/form', (req, res) => {
  res.render('form')
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
      // runs when password is correct
      // User Name -> user-name-wg0.conf
      // finally, show the config here with download
      // and email it to them with Mailgun or something
      // probably save all info in a db
      console.log('Successful attempt with ' + JSON.stringify(fields) + ' from ' + req.ip)
      fs.appendFileSync('accounts.json', JSON.stringify(fields) + '\n')
      console.log('Generating new peer config...')
      // sanitize username
      const parsedUsername = sanitize(
        fields.username.toString().replace(/ /g, '-').toLowerCase()
      )
      // then generate the rest
      const generatedPkey = execSync('wg genkey').toString()
      const generatedPubkey = execSync(
        "echo '" + generatedPkey + "' | wg pubkey"
      ).toString()
      let publicKey
      if (args.dryRun) {
        publicKey = 'nM90EOAOKupKpgNw2VjzSJqeDVGYq0whRObo/PCGw3w='
      } else {
        publicKey = execSync(
          'wg show ' + settings.interface + ' public-key'
        ).toString()
      }
      const generatedPsk = execSync('wg genpsk').toString()
      let generatedDns
      if (fields.dns === true) {
        generatedDns = settings.dns
      } else {
        generatedDns = '1.1.1.1'
      }
      let generatedAddress
      let wgConfig
      if (args.dryRun === true) {
        wgConfig = fs.readFileSync(
          'test-example.conf',
          'utf8'
        )
      } else {
        wgConfig = fs.readFileSync(
          '/etc/wireguard/' + settings.interface + '.conf',
          'utf8'
        )
      }
      // find unused WireGuard peer IP
      for (let i = 2; i < 255; i++) {
        if (wgConfig.includes(settings.subnet.toString().slice(0, -1) + i)) {
          // console.log(settings.subnet.toString().slice(0, -1) + i + ' already taken')
        } else {
          generatedAddress = settings.subnet.toString().slice(0, -1) + i
          console.log(generatedAddress + ' is unused. Using it.')
          break
        }
      }
      // create config for user
      const userConfig = 'client-' + parsedUsername + settings.interface + '.conf'
      fs.writeFileSync(
        userConfig,
        '[Interface]' +
        '\nPrivateKey = ' +
        execSync('wg genkey').toString() +
        '\nAddress = ' +
        generatedAddress +
        '\nDNS = ' +
        generatedDns +
        '\n[Peer]\nPublicKey = ' +
        publicKey +
        '\nPresharedKey = ' +
        generatedPsk +
        '\nAllowedIPs =  ' +
        settings.allowedIps +
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
        saveto = 'test-' + settings.interface + '.conf'
      } else {
        saveto = '/etc/wireguard/' + settings.interface + '.conf'
      }
      // add user to server config
      fs.appendFileSync(
        saveto,
        '### Client ' +
        fields.username +
        '\n[Peer]' +
        '\nPublicKey = ' +
        generatedPubkey +
        'PresharedKey = ' +
        generatedPsk +
        'AllowedIPs = ' +
        generatedAddress +
        '/32' +
        '\n'
      )
      console.log('Successfully generated config at ' + userConfig)
      // ...and then we present it to the user.
      res.render('success', {
        form: JSON.stringify(fields),
        fileData: fs.readFileSync(userConfig, 'base64'),
        saveName: userConfig
      })
      // TODO: Save info to database or JSON
      // TODO: Email integration
    } else {
      // when authentication fails
      console.log('Failed attempt with ' + JSON.stringify(fields) + ' from ' + req.ip)
      res.render('fail')
    }
  })
})
app.listen(settings.port, () => {
  console.log('Server listening on http://localhost:' + settings.port + ' ...')
})
