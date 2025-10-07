# Swagme
![Static Badge](https://img.shields.io/badge/v1.0.0-maroon?style=plastic&logo=npm&logoColor=maroon&logoSize=20&label=version)
![Static Badge](https://img.shields.io/badge/MIT-green?style=plastic&logo=license&logoColor=green&label=license)
![Static Badge](https://img.shields.io/badge/m2kdevelopments-purple?style=plastic&logo=github&logoColor=purple&label=developer&link=https%3A%2F%2Fgithub.com%2Fm2kdevelopments)
![Static Badge](https://img.shields.io/badge/buy_me_a_coffee-yellow?style=plastic&logo=buymeacoffee&logoColor=yellow&label=support&link=https%3A%2F%2Fwww.buymeacoffee.com%2Fm2kdevelopments)
![Static Badge](https://img.shields.io/badge/paypal-blue?style=plastic&logo=paypal&logoColor=blue&label=support&link=https%3A%2F%2Fpaypal.me%2Fm2kdevelopment)

## About
Node Js CLI tool that auto generates swagger api documentation for express web and nextjs servers. Takes advantage of the MVC Pattern


## How to Use
This is will create <b>swag.config.json</b>, <b>swagger.json</b> and <b>swagger.yml</b> based on your project.
```bash
npx swagme
```


## Swagger UI Packages For Express JS
```bash
npm i swagger-ui-express yaml
```


## Swagger UI Setup
```js
const express = require('express');
const app = express();
const fs = require("fs")
const path = require('path')
const SwaggerUI = require('swagger-ui-express');
const swaggerdocs = YAML.parse(fs.readFileSync(path.join(__dirname, 'swagger.yml'), 'utf-8')); // require('./swagger.json')

//e.g Endpoint for Swagger Documentation
app.use('/api/documentation', SwaggerUI.serve, SwaggerUI.setup(swaggerdocs));

```

## Support

<a href="https://www.buymeacoffee.com/m2kdevelopments" target="_blank">
<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" >
</a>
