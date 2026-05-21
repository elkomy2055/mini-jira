const { CognitoJwtVerifier } = require("aws-jwt-verify");
const { COGNITO } = require("../config/constants");

const verifier = CognitoJwtVerifier.create({
  userPoolId: COGNITO.USER_POOL_ID,
  tokenUse: "access",
  clientId: COGNITO.CLIENT_ID,
});

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }

    const token = authHeader.split(" ")[1];
    const payload = await verifier.verify(token);

    req.user = {
      sub: payload.sub,
      username: payload.username || payload["cognito:username"],
      email: payload.email,
      role: payload["custom:role"] || "employee",
      teamId: payload["custom:teamId"] || null,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
};

const requireManager = requireRole("manager", "admin");

module.exports = { authenticate, requireRole, requireManager };
