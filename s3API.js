const express = require('express')
const app = express()
const port = 5353

const s3Helper = require('./helpers/s3Helper.js');

app.get('/', (req, res) => {
  return s3Helper.getOrionVehicleFiles(
      req.query.agency, req.query.start_epoch, req.query.end_epoch,
  ).then(links => {
    if (!links || !Array.isArray(links) || links === []) {
      res.send(500, 'Links list empty');
    }
    return s3Helper.getS3Vehicles(links);
  }).then(vehicles => res.send(vehicles));
})

app.listen(port, () => console.log(`S3 helper API listening on port ${port}!`))