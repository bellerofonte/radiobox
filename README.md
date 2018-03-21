# RPi-Radio

This stuff turns your Raspberry Pi into internet-radio box.
It wraps MPD and provides Web-UI for controlling it's playback and volume.

Since commit `#18` RPi-Radio also uses five GPIO pins to control playback and indicate current player state.
The pins are:
* Input pin (for button switch)
* Output pin for LED blinking
* Output pin for switching amplifier on/off
* +3.3V
* Ground

The ![`schematic.png`](./schematic.png) shows how it is supposed to be implemented.

Input and output pins are to be specified in `config.json` file. 

#### Building 

Checkout from Github repository to your PC/Mac and run
```
npm install
npm run prod
```
By default, output directory is `./target`. You can change it in `webpackfile.js`

#### Installing

*I mean that Nodejs and MPD have been installed and configured already.*

First, copy files from output directory anywhere to your Raspberry Pi. Then install needed Nodejs modules
```
npm install http express socket.io mpc-js rpi-gpio
```
You can modify stations list in `config.json` file.

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