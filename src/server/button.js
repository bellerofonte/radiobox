const EventEmitter = require('events');
const {Reader} = require('./pin');

module.exports = class extends EventEmitter {
    constructor(pin, longPressTimeout, longPressTimerInterval = 0) {
        super();
        this.pin = new Reader(pin);
        this.longPressHandler = null;
        this.longPressTimer = 0;
        this.updateBlinking = null;
        this.pin.on('changed', value => {
            if (value) {
                // button is pressed
                // reset old timeout if it exists
                if (this.longPressHandler)
                    clearTimeout(this.longPressHandler);
                // setup new timeout for long-press event
                if (longPressTimeout > 0) {
                    this.longPressHandler = setTimeout(() => {
                        if (this.longPressHandler) {
                            clearTimeout(this.longPressHandler);
                            this.longPressHandler = null;
                        }
                        if (longPressTimerInterval > 0) {
                            if (this.longPressTimer) {
                                clearInterval(this.longPressTimer);
                            }
                            this.longPressTimer = setInterval(() => {
                                this.emit('hold', this);
                            }, longPressTimerInterval);
                            this.emit('hold', this);
                        } else {
                            this.emit('long', this);
                        }
                    }, longPressTimeout);
                }
                // now - call 'updateBlinking' callback
                if (this.updateBlinking)
                    this.updateBlinking();
                this.emit('down', this);
            } else {
                // reset any timer or timeout
                if (this.longPressHandler) {
                    clearTimeout(this.longPressHandler);
                    this.longPressHandler = null;
                }
                if (this.longPressTimer) {
                    clearInterval(this.longPressTimer);
                    this.longPressTimer = null;
                }
                // now - call 'updateBlinking' callback
                if (this.updateBlinking)
                    this.updateBlinking();
                this.emit('up', this);
            }
        });
    }

    isPressed() {
        return this.pin.get() === 1;
    }
    
    setup(updateBlinking) {
        this.updateBlinking = updateBlinking;
        return this.pin.setup();
    }
};