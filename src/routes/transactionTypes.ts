import express from "express";

import { prisma } from "../prisma";

export const transactionTypesRouter = express.Router();

// Get all transaction types
transactionTypesRouter.get("/", async (_req, res) => {
  try {
    const transactionTypes = await prisma.transactionType.findMany({
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      transactionTypes,
    });
  } catch (error) {
    console.error("Failed to fetch transaction types:", error);

    res.status(500).json({
      error: "Failed to fetch transaction types",
    });
  }
});

// Create a transaction type
transactionTypesRouter.post("/", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        error: "Name is required",
      });
    }

    const transactionType = await prisma.transactionType.create({
      data: {
        name: name.trim(),
      },
    });

    res.status(201).json({
      transactionType,
    });
  } catch (error) {
    console.error("Failed to create transaction type:", error);

    res.status(500).json({
      error: "Failed to create transaction type",
    });
  }
});

transactionTypesRouter.patch("/:transactionTypeId/budget", async (req, res) => {
  try {
    const { transactionTypeId } = req.params;
    const { monthlyBudget } = req.body;

    if (typeof monthlyBudget !== "number" || monthlyBudget < 0) {
      return res.status(400).json({
        error: "monthlyBudget must be a positive number",
      });
    }

    const transactionType = await prisma.transactionType.update({
      where: {
        id: transactionTypeId,
      },
      data: {
        monthlyBudget,
      },
    });

    res.json({
      transactionType,
    });
  } catch (error) {
    console.error("Failed to update transaction type budget:", error);

    res.status(500).json({
      error: "Failed to update budget",
    });
  }
});
