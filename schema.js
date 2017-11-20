const loader = require('@creditkarma/graphql-loader');

module.exports = async () => await loader.loadSchema('./*.graphql');
