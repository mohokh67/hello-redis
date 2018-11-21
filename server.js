const express = require('express');
const path = require('path');
const axios = require('axios');
const redis = require('redis');

const app = express();

const API_URL = 'http://data.fixer.io/api/';
const API_ACCESS_KEY = '04028283c32663d999fee8e530040049';

// Make sure redis is running
// Default URL for redis is 127.0.0.1:6379
// const REDIS_URL = '127.0.0.1:6379';
// const client = redis.createClient(REDIS_URL);

const client = redis.createClient();
client.on('connect', () => {
  console.log(`connected to redis`);
});
client.on('error', err => {
  console.log(`Error: ${err}`);
});

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: path.join(__dirname, 'views')
  });
});

app.get('/rate/:date', (req, res) => {
  const { date } = req.params;
  const url = `${API_URL}/${date}?access_key=${API_ACCESS_KEY}&symbols=USD,AUD,CAD,GBP,EUR`;
  // console.log(url);
  const countKey = `USD:${date}:count`;
  const ratesKey = `USD:${date}:rates`;

  client.incr(countKey, (err, count) => {
    client.hgetall(ratesKey, (err, rates) => {
      if (rates) {
        console.log('Found in Redis');
        return res.json({ rates, count });
      }
      axios
        .get(url)
        .then(response => {
          // save the rates to the redis store
          console.log('Writing in Redis');
          client.hmset(ratesKey, response.data.rates, (error, result) => {
            if (error) console.log(error);
          });

          return res.json({
            count,
            rates: response.data.rates
          });
        })
        .catch(error => res.json(error.response.data));
    });
  });
});

const port = process.env.port || 5000;

app.listen(port, () => {
  console.log(`App listening on port ${port}!`);
});
