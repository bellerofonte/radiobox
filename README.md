# RPi-Radio

This stuff turns your Raspberry Pi into internet-radio box.
It wraps MPD and provides Web-UI for controlling it's playback and volume.

#### Building 

Checkout from Github repository to your PC/Mac and run
```
npm install
npm run prod
```
By default, output directory is `./target`. You can change it in `webpackfile.js`

#### Installing

I mean that Nodejs and MPD have been installed and configured already.
First, copy files from output directory anywhere to your Raspberry Pi.
Then install needed Nodejs modules
```
npm install http express socket.io mpc-js
```
You can modify stations list in `stations.json` file.

#### Running
```
sudo nodejs index.js 
```
Or create service using systemctl or init.d.

Http- and WebSocket- servers will run at port 80 (so you need `sudo`).
Now browse 
```
http://<your_raspberry_ip>/
``` 
or 
```
http://<your_raspberry_hostname>/
``` 
and enjoy your favorite stations!