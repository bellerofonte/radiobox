module.exports = process.env.DEBUG === '1'
    ? {
        on: (ev, cb) => { },
        setup: (pin, dir, cb1, cb2) => {
            if (cb2) {
                cb2(null);
            } else {
                cb1(null);
            }
        },
        read: (pin, cb) => {
            cb(null, 1); // just return 1 = GPIO.HIGH
        },
        write: (pin, val, cb) => {
            cb(null);
        },
        destroy: (cb) => {
            console.log('\'destroy\' method called');
            cb && cb();
        }
    }
    : require('rpi-gpio');

