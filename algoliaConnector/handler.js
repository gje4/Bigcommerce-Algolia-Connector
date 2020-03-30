"use strict";
const request = require("request-promise");
const algoliasearch = require("algoliasearch");

const client = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_API_KEY
);

async function getProductData(productId) {
  const options = {
    method: "GET",
    uri: `https://api.bigcommerce.com/stores/${process.env.STORE_HASH}/v3/catalog/products/${productId}?include=images`,
    headers: {
      accept: "application/json",
      "X-Auth-Client": process.env.BC_CLIENT,
      "X-Auth-Token": process.env.BC_TOKEN
    }
  };
  var productData = await request(options);
  return productData;
}

module.exports.algolia = async event => {
  let catalogData = JSON.parse(event.body);
  console.log("catalogData", catalogData);
  const [store, type, trigger] = catalogData.scope.split("/");
  const index = client.initIndex(type);
  console.log("trigger", trigger);
  var body;

  if (trigger == "deleted") {
    const body = await index.deleteObject(catalogData.data.id);
  } else {
    const productDataRaw = await getProductData(catalogData.data.id);
    const product = JSON.parse(productDataRaw);
    console.log("Product", product);
    const object = { objectID: catalogData.data.id, ...product };

    //update/add
    if (trigger == "updated") {
      const body = await index.saveObject(object);
    } else if (trigger == "created") {
      const body = await index.addObject(object);
    }
  }
  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Credentials": true,
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
};
