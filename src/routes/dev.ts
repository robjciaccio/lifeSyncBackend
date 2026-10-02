import express from "express";

import { prisma } from "../prisma";

export const devRouter = express.Router();

devRouter.delete("/reset", async (_req, res) => {
  try {
    await prisma.financialAccount.deleteMany();
    await prisma.plaidItem.deleteMany();

    res.json({
      success: true,
    });
  } catch (error) {
    console.error("Failed to reset database:", error);

    res.status(500).json({
      error: "Failed to reset database",
    });
  }
});
