# wg-auto-web

Early development

Should work, mostly. Expect at least a few bugs. Not all planned features are implemented.

For example, a username with spaces or special characters in it is not currently handled properly. Email integration is also not implemented, nor is saving the form inputs to a database, or rate-limiting failed requests.

## What

wg-auto-web is a simple Node.js app that automatically creates a WireGuard peer config on a server,
and serves it to the user. It has very simple authentication (not very secure at all) but it's
not meant to be production-ready code. I'm using it to share a VPN with friends without having
to SSH into the server.

It features a simple fronend, a secret password required to actually generate a config, automatic
config generation, and the capability to email the config and let the user download it.

It's also useful for just one user (me) to add multiple devices easily. While it's not intended
for other people (you) to clone it and use it yourself, you can if you want to. I just wanted to
put the source out there for other people to learn from it.

It mentions features specific to my VPN service, like Adblocking with PiHole, and my name on it,
so you'll need to edit it accordingly. I'll probably split it into a generic and customized branch
eventually.

## Install

```
git clone https://github.com/Randomblock1/wg-auto-web

cd wg-auto-web

npm i
```

Done.

## Usage

`node app.js -h`

shows help.

`node app.js`

runs the app with settings at `settings.yml`.

`node app.js generate`

generates a new valid (but not working) settings config, and moves the old one to `old_settings.yml`

## Settings

Below is a sample settings file. Without a proper settings file, this will not work as intended.

```
password: YourPasswordHere
# This is the password needed to allow a user to generate a config via the web interface form.

port: 3000
# This is where users can access the form. They'll have to enter it like this: `1.2.3.4:3000` in their browser.

dns: 1.1.1.1
# This is the DNS used when the user wants a custom DNS to be used. I set it to my PiHole in a Docker container to block ads.

allowedips: ::/0, 1.0.0.0/8, 2.0.0.0/8, 3.0.0.0/8, 4.0.0.0/6, 8.0.0.0/7, 11.0.0.0/8, 12.0.0.0/6, 16.0.0.0/4, 32.0.0.0/3, 64.0.0.0/2, 128.0.0.0/3, 160.0.0.0/5, 168.0.0.0/6, 172.0.0.0/12, 172.32.0.0/11, 172.64.0.0/10, 172.128.0.0/9, 173.0.0.0/8, 174.0.0.0/7, 176.0.0.0/4, 192.0.0.0/9, 192.128.0.0/11, 192.160.0.0/13, 192.169.0.0/16, 192.170.0.0/15, 192.172.0.0/14, 192.176.0.0/12, 192.192.0.0/10, 193.0.0.0/8, 194.0.0.0/7, 196.0.0.0/6, 200.0.0.0/5, 208.0.0.0/4
# This allowedips list is used to allow local (non-Internet, LAN only) traffic to bypass WireGuard, so you can talk to devices on your local network.

subnet: 10.66.66.0
# This is what ip range to assign new configs to, netmask 24 only (it will only check if the IP comes from 10.66.66.x in this example).

endpoint: 0.0.0.0:1234
# This is where your server's WireGuard is publicly accessible from the internet (with port).
# You MUST configure this properly, or your clients won't be able to connect.

interface: wg0
# This is the wireguard interface to use when creating new configs.
