export const alertObj = (message, title = '', type = 'success') => {
    return { alerts: [{id: randomId(), type, title, message, timeout: 1000, dismissible: true}]};
};

export const alertFixed = (message, title = '', type = 'danger') => {
    return { alerts: [{id: -1, type, title, message, timeout: 0, dismissible: false}]};
};

export const randomId = () => Math.floor(1000000 + (1000000 * Math.random()));