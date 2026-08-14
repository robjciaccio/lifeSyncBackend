import "dotenv/config";
import express from "express";
import { plaidClient } from "./plaid";
import { CountryCode, Products } from "plaid";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Finance BFF is running" });
});

app.post("/plaid/link-token", async (_req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: "rob-1",
      },
      client_name: "LifeSync",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
    });

    res.json({
      linkToken: response.data.link_token,
    });
  } catch (error: any) {
    console.error("Plaid error:", error.response?.data ?? error);

    res.status(500).json({
      error: error.response?.data ?? "Failed to create Plaid link token",
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
