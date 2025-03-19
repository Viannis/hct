import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

console.log("Validating JWT");

const jwksClient = new JwksClient({ // Create a JwksClient
  jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`, // Jwks URI to fetch the JWKS from Auth0
});

console.log("JWKS client created", jwksClient); // Log the JWKS client

function getKey( // Function to get the key
  header: jwt.JwtHeader, // Header of the JWT
  callback: (err: Error | null, signingKey?: string) => void // Callback function to get the key
) {
  console.log("Getting key"); // Log the getting key
  jwksClient.getSigningKey(header.kid, function (err, key) { // Get the key from the JWKS client
    if (key) {
      console.log("Got key", key); // Log the got key
      const signingKey = key.getPublicKey(); // Get the public key
      callback(null, signingKey); // Call the callback function with the public key
    } else {
      console.error("❌ Signing key not found", err); // Log the error
      callback(new Error("Signing key not found")); // Call the callback function with the error
    } 
  });
}

export function verifyAccessToken(token: string) { // Function to verify the access token
  return new Promise((resolve, reject) => { // Return a promise
    jwt.verify( // Verify the access token
      token,
      getKey,
      {
        audience: `${process.env.AUTH0_CLIENT_ID}`, // Audience of the access token
        issuer: `${process.env.AUTH0_ISSUER_BASE_URL}/`, // Issuer of the access token
        algorithms: ["RS256"], // Algorithms of the access token
      },
      (err, decoded) => { // Callback function to verify the access token
        if (err) {
          reject(err);
        } else {
          resolve(decoded); // Resolve the promise with the decoded access token
        }
      }
    );
  });
}
