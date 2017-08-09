import {parseJSON} from './parse';

export const loadConfig = () => {
    const saved_ = parseJSON(localStorage.getItem('osmc-remote'));
    return {
        connections: saved_.availableConnections || [ ],
        useCtrl: !!saved_.useCtrl,
        useVPN: !!saved_.useVPN
    };
};

export const saveConfig = (newConfig) => {
    const temp_ = {
        availableConnections: newConfig.connections || [ ],
        useCtrl: !!newConfig.useCtrl,
        useVPN: !!newConfig.useVPN
    };
    localStorage.setItem('osmc-remote', JSON.stringify(temp_));
};