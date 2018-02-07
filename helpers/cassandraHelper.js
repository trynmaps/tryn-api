const cassandra = require('cassandra-driver');
const config = require('../config');

const client = new cassandra.Client({
    contactPoints: [config.cassandraURL],
});
client.connect((err) => {
    console.log('connected to cassandra');
    console.log('error: ' + err);
});

function executeQuery(query, params) {
    // TODO - fetch large sizes properly by streaming them
    // https://docs.datastax.com/en/developer/nodejs-driver/3.2/features/paging/
    return client.execute(query, params, { prepare: true, fetchSize: 50000 });
}

module.exports = executeQuery;
