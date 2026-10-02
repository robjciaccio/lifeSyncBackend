import express from "express";
import { syncPlaidAccounts } from "../services/syncPlaidAccounts";
import { prisma } from "../prisma";

export const accountsRouter = express.Router();

accountsRouter.get("/", async (_req, res) => {
  try {
    const accounts = await prisma.financialAccount.findMany({
      include: {
        plaidItem: {
          select: {
            itemId: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      accounts,
    });
  } catch (error) {
    console.error("Failed to fetch accounts:", error);

    res.status(500).json({
      error: "Failed to fetch accounts",
    });
  }
});

accountsRouter.post("/refresh", async (_req, res) => {
  try {
    const plaidItems = await prisma.plaidItem.findMany();

    let accountCount = 0;

    for (const plaidItem of plaidItems) {
      accountCount += await syncPlaidAccounts(
        plaidItem.accessToken,
        plaidItem.id,
      );
    }

    res.json({
      success: true,
      accountCount,
    });
  } catch (error) {
    console.error("Failed to refresh accounts:", error);

    res.status(500).json({
      error: "Failed to refresh accounts",
    });
  }
});
