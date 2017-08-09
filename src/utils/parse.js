export const parseJSON = (text) => {
    if (!text) {
        return {plainText: '--'};
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        return {plainText: text};
    }
};