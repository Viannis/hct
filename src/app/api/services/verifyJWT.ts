import jwt from "jsonwebtoken";
import { JwksClient } from "jwks-rsa";

console.log("Validating JWT");

const jwksClient = new JwksClient({
  jwksUri: `${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`,
});

console.log("JWKS client created", jwksClient);

function getKey(
  header: jwt.JwtHeader,
  callback: (err: Error | null, signingKey?: string) => void
) {
  console.log("Getting key");
  jwksClient.getSigningKey(header.kid, function (err, key) {
    if (key) {
      console.log("Got key", key);
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    } else {
      console.error("❌ Signing key not found", err);
      callback(new Error("Signing key not found"));
    }
  });
}

export function verifyJWT(token: string) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
        issuer: `${process.env.AUTH0_ISSUER_BASE_URL}/`,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      }
    );
  });
}
