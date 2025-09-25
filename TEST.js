// Make sure that you are using the 18+ version of Node.js

import crypto from "crypto";
import { Buffer } from "buffer";

const hostname = "https://whitebit.com";

const publicKey = "caecf19a47f3ae07b04a5a3da830598e";
const secretKey = "561f7fbf901c8e3d5e48d3940508a4b5";

/**
 * @see [https://whitebit-exchange.github.io/api-docs/private/http-auth/#body-data](https://whitebit-exchange.github.io/api-docs/private/http-auth/#body-data)
 */
function getRequestBody(url, extendedBodyData) {
    return Object.assign(
        {
            request: url,
            nonce: Date.now(),
            nonceWindow: true,
        },
        extendedBodyData
    );
}

/**
 * @see [https://whitebit-exchange.github.io/api-docs/private/http-auth/#headers](https://whitebit-exchange.github.io/api-docs/private/http-auth/#headers)
 */
function getRequestParameters(params) {
    const body = JSON.stringify(params);
    const payload = Buffer.from(body).toString("base64");
    const hash = crypto.createHmac("sha512", secretKey);
    const signature = hash.update(payload).digest("hex");

    const headers = {
        "Content-Type": "application/json",
        "X-TXC-APIKEY": publicKey,
        "X-TXC-PAYLOAD": payload,
        "X-TXC-SIGNATURE": signature,
    };

    return { headers, body };
}

/**
 * @see [https://whitebit-exchange.github.io/api-docs/private/http-trade-v4/#trading-balance](https://whitebit-exchange.github.io/api-docs/private/http-trade-v4/#trading-balance)
 */
async function getTradeBalance(ticker) {
    const requestUrl = "/api/v4/trade-account/balance";
    const fullUrl = new URL(requestUrl, hostname);

    const parameters = ticker ? { ticker } : undefined;
    const data = getRequestBody(requestUrl, parameters);
    const { body, headers } = getRequestParameters(data);

    // Log the complete request
    console.log("=== FULL REQUEST ===");
    console.log("URL:", fullUrl.toString());
    console.log("Method: POST");
    console.log("Headers:", JSON.stringify(headers, null, 2));
    console.log("Body:", body);
    console.log("Body (parsed):", JSON.stringify(JSON.parse(body), null, 2));
    console.log("========================");

    try {
        const response = await fetch(fullUrl, {
            method: "POST",
            body,
            headers,
        });

        console.log("=== RESPONSE ===");
        console.log("Status code:", response.status);
        console.log("Status text:", response.statusText);
        console.log("Response headers:", JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));

        const responseText = await response.text();
        console.log("Raw response body:", responseText);

        let data;
        try {
            data = JSON.parse(responseText);
            console.log("Parsed response:", JSON.stringify(data, null, 2));
        } catch (parseError) {
            console.log("Failed to parse response as JSON:", parseError.message);
            data = responseText;
        }
        console.log("================");

        return data;
    } catch (error) {
        console.log("=== ERROR ===");
        console.log("Error message:", error.message);
        console.log("Error stack:", error.stack);
        console.log("=============");
        return null;
    }
}

const balance = await getTradeBalance("BTC");

console.log("\n=== FINAL RESULT ===");
console.log(balance);
console.log("===================");
