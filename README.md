# wg-auto-web

In development. It won't be useful to you, and it doesn't work right now.

## what

wg-auto is a simple Node.js app that automatically creates a WireGuard peer config on a server,
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

## install

git clone it

`npm i`

done.

## usage

node app.js -h

shows help.

node app.js \<password\>

runs the app with the given password.
