const fetch = require("node-fetch"); // actually Node 18+ has fetch built-in, but just in case...
// Or just use native fetch if node version is > 18.

async function testWebhook() {
  const payload = {
    type: "transaction-update",
    data: {
      requestId: "202602150832529dev407ck",
      content: {
        transactions: {
          status: "delivered",
        },
      },
    },
  };

  try {
    const response = await fetch(
      "http://localhost:3000/api/webhooks/vt-pass/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Body:", data);
  } catch (error) {
    console.error("Error:", error);
  }
}

testWebhook();
