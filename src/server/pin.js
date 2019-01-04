const EventEmitter = require('events');
const GPIO = require('./gpio');

const Reader = class extends EventEmitter  {
    constructor(pin) {
        super();
        this.pin = pin;
        this.value = 0;
    }

    get() {
        return this.value;
    }

    setup() {
        if (!this.pin) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            GPIO.on('change', (channel, val) => {
                if (channel === this.pin) {
                    const value_ = +val;
                    if (value_ !== this.value) {
                        this.value = value_;
                        this.emit('changed', this.value);
                    }
                }
            });
            GPIO.setup(this.pin, GPIO.DIR_IN, GPIO.EDGE_BOTH,
                (err) => { err ? reject(err) : resolve(); }); // off at startup
        });
    }
};

const Writer = class {
    constructor(pin) {
        this.pin = pin;
        this.value = NaN;
    }

    setup() {
        if (!this.pin) {
            return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
            GPIO.setup(this.pin, GPIO.DIR_LOW, err => {
                if (err) reject(err);
                else {
                    this.value = 0;
                    resolve();
                }
            }); // off at startup
        });
    }

    set(val) {
        const value = +val;
        if (value !== 0 && value !== 1) {
            return Promise.reject(new Error('Wrong value: neither 0 nor 1'));
        }
        if (value === this.value) {
            return Promise.resolve(value); // do nothing
        }
        if (!this.pin) {
            // in case of undefined pin - just set target value
            this.value = value;
            return Promise.resolve(value);
        }
        return new Promise((resolve, reject) => {
            GPIO.write(this.pin, value, err => {
                if (err) reject(err);
                else {
                    this.value = value;
                    resolve(value);
                }
            });
        });
    }

    get() {
        return this.value;
    }

    toggle() {
        return this.set(1 - this.value);
    }

    getStr() {
        switch (this.value) {
            case 0: return 'Off';
            case 1: return 'On';
            default: return 'Broken';
        }
    }
};

module.exports = { Reader, Writer };