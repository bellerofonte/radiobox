module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es6": true,
        "mocha": true
    },
    "globals": {
        "sinon": true,
        "should": true,
        "API_DEFAULT_URL": true,
        "USE_FAKE_SERVER": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:no-unused-vars-rest/recommended"
    ],
    "parserOptions": {
        "ecmaFeatures": {
            "experimentalObjectRestSpread": true,
            "jsx": true
        },
        "sourceType": "module"
    },
    "plugins": [
        "react",
        "no-unused-vars-rest"
    ],
    "rules": {
        "indent": [
            "warn",
            4, {"SwitchCase": 1}
        ],
        "quotes": [
            "warn",
            "single"
        ],
        "semi": [
            "warn",
            "always"
        ],
        "curly": [
            "warn",
            "multi-line"
        ],
        "padded-blocks": [
            "warn",
            "never"
        ],
        "no-var": "error",
        "brace-style": [
            "warn",
            "1tbs"
        ],
        "no-console": 0,
        "react/display-name": 0,
        "react/prop-types": 0
    }
};
