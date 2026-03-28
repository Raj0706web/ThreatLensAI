module.exports = {
  suspiciousKeywords: [
    "urgent",
    "immediately",
    "asap",
    "verify",
    "update",
    "account",
    "login",
    "password",
    "bank",
    "invoice",
    "payment",
    "transfer",
    "click",
    "confirm",
  ],

  sensitiveRequests: [
    "send money",
    "wire transfer",
    "share credentials",
    "provide password",
    "verify account",
    "reset password",
    "sign the document",
    "digital signature",
    "review attached",
    "click the link",
    "access your portal",
  ],

  impersonationPatterns: [
    "ceo",
    "manager",
    "hr",
    "admin",
    "support team",
    "finance department",
    "human resources",
  ],

  genericGreetings: ["dear user", "valued employee", "team member", "hi all"],

  trustedDomains: [
    "@yourcompany.com",
    "@microsoft.com",
    "@freecodecamp.org",
    "@github.com",
    "@google.com",
    "@linkedin.com",
  ],

  legitIndicators: [
    "open enrollment",
    "benefits guide",
    "company policy",
    "internal portal",
    "employee handbook",
    "annual review",
  ],
  shorteners: ["bit.ly", "tinyurl", "goo.gl", "t.co", "ow.ly"],
  suspiciousTLDs: ["xyz", "top", "click", "ru", "tk", "cn", "info"],
};
