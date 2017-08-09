module.exports = {
    "extends": [
        "stylelint-config-standard",
        "stylelint-config-css-modules"
    ],
    "rules": {
        "indentation": 4,
        "property-no-vendor-prefix": true,
        "shorthand-property-no-redundant-values": null,
        "color-hex-length": null,
        "block-no-empty": null,
        "selector-class-pattern": /^[a-z0-9_\-]+$/
    }
};
