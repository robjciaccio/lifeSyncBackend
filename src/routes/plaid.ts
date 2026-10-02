import express from "express";
import { CountryCode, Products } from "plaid";

import { plaidClient } from "../plaid";
import { prisma } from "../prisma";
import { syncPlaidAccounts } from "../services/syncPlaidAccounts";

export const plaidRouter = express.Router();

plaidRouter.post("/link-token", async (_req, res) => {
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

plaidRouter.post("/exchange-token", async (req, res) => {
  try {
    const { publicToken } = req.body;

    if (!publicToken) {
      return res.status(400).json({
        error: "publicToken is required",
      });
    }

    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    const plaidItem = await prisma.plaidItem.upsert({
      where: {
        itemId,
      },
      update: {
        accessToken,
      },
      create: {
        itemId,
        accessToken,
      },
    });

    const accountCount = await syncPlaidAccounts(accessToken, plaidItem.id);

    res.json({
      success: true,
      accountCount,
    });
  } catch (error: any) {
    console.error("Plaid exchange error:", error.response?.data ?? error);

    res.status(500).json({
      error: error.response?.data ?? "Failed to connect Plaid account",
    });
  }
});

plaidRouter.post("/update-link-token", async (req, res) => {
  try {
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({
        error: "itemId is required",
      });
    }

    const plaidItem = await prisma.plaidItem.findUnique({
      where: {
        itemId,
      },
    });

    if (!plaidItem) {
      return res.status(404).json({
        error: "Plaid item not found",
      });
    }

    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: "rob-1",
      },

      client_name: "LifeSync",

      country_codes: [CountryCode.Us],

      language: "en",

      // THIS is what puts Link into update mode
      access_token: plaidItem.accessToken,
    });

    res.json({
      linkToken: response.data.link_token,
    });
  } catch (error) {
    console.error("Failed to create update link token:", error);

    res.status(500).json({
      error: "Failed to create update link token",
    });
  }
});
