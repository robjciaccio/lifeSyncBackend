import express from "express";

import { prisma } from "../prisma";
import { syncPlaidTransactions } from "../services/syncPlaidTransactions";

export const transactionsRouter = express.Router();

transactionsRouter.post("/refresh", async (_req, res) => {
  try {
    const plaidItems = await prisma.plaidItem.findMany();

    let addedCount = 0;
    let modifiedCount = 0;
    let removedCount = 0;

    for (const plaidItem of plaidItems) {
      const result = await syncPlaidTransactions(
        plaidItem.accessToken,
        plaidItem.id,
        plaidItem.cursor,
      );

      addedCount += result.addedCount;
      modifiedCount += result.modifiedCount;
      removedCount += result.removedCount;
    }

    res.json({
      success: true,
      addedCount,
      modifiedCount,
      removedCount,
    });
  } catch (error: any) {
    console.error(
      "Failed to refresh transactions:",
      error.response?.data ?? error,
    );

    res.status(500).json({
      error: error.response?.data ?? "Failed to refresh transactions",
    });
  }
});

transactionsRouter.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const cursor =
      typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const date =
      typeof req.query.date === "string" ? req.query.date : undefined;

    const accountId =
      typeof req.query.accountId === "string" ? req.query.accountId : undefined;

    let dateFilter = {};

    if (date) {
      const startDate = new Date(`${date}T00:00:00.000Z`);
      const endDate = new Date(`${date}T23:59:59.999Z`);

      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        ...dateFilter,
        ...(accountId && {
          financialAccountId: accountId,
        }),
      },

      take: limit + 1,

      ...(cursor && {
        cursor: {
          id: cursor,
        },
        skip: 1,
      }),

      orderBy: [
        {
          date: "desc",
        },
        {
          id: "desc",
        },
      ],

      include: {
        financialAccount: {
          select: {
            id: true,
            name: true,
            subtype: true,
            mask: true,
          },
        },
        transactionType: true,
      },
    });

    const hasMore = transactions.length > limit;

    const results = hasMore ? transactions.slice(0, limit) : transactions;

    const nextCursor = hasMore ? results[results.length - 1]?.id : null;

    res.json({
      transactions: results,
      nextCursor,
    });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);

    res.status(500).json({
      error: "Failed to fetch transactions",
    });
  }
});

transactionsRouter.get("/daily-spending", async (req, res) => {
  try {
    const year = Number(req.query.year);
    const month = Number(req.query.month);

    if (!year || !month || month < 1 || month > 12) {
      return res.status(400).json({
        error: "Valid year and month are required",
      });
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1));

    const endDate = new Date(Date.UTC(year, month, 1));

    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
        pending: false,
        amount: {
          gt: 0,
        },
      },
      select: {
        date: true,
        amount: true,
      },
    });

    const spendingByDay = transactions.reduce(
      (totals: Record<string, number>, transaction) => {
        const date = transaction.date.toISOString().split("T")[0];

        totals[date] = (totals[date] ?? 0) + transaction.amount;

        return totals;
      },
      {},
    );

    res.json({
      year,
      month,
      spendingByDay,
    });
  } catch (error) {
    console.error("Failed to fetch daily spending:", error);

    res.status(500).json({
      error: "Failed to fetch daily spending",
    });
  }
});

transactionsRouter.get("/spending-by-type", async (req, res) => {
  try {
    const now = new Date();

    const year = Number(req.query.year) || now.getFullYear();
    const month = Number(req.query.month) || now.getMonth() + 1;

    const startDate = new Date(Date.UTC(year, month - 1, 1));

    const endDate = new Date(Date.UTC(year, month, 1));

    // Get ALL transaction types
    const transactionTypes = await prisma.transactionType.findMany({
      orderBy: {
        name: "asc",
      },
    });

    // Get this month's categorized transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },

        pending: false,

        amount: {
          gt: 0,
        },

        transactionTypeId: {
          not: null,
        },
      },
    });

    // Calculate spending totals
    const totals = new Map<
      string,
      {
        spent: number;
        transactionCount: number;
      }
    >();

    for (const transaction of transactions) {
      if (!transaction.transactionTypeId) {
        continue;
      }

      const existing = totals.get(transaction.transactionTypeId);

      if (existing) {
        existing.spent += transaction.amount;
        existing.transactionCount += 1;
      } else {
        totals.set(transaction.transactionTypeId, {
          spent: transaction.amount,
          transactionCount: 1,
        });
      }
    }

    // Start with ALL categories, even ones with no spending
    const spendingByType = transactionTypes.map((type) => {
      const spending = totals.get(type.id);

      return {
        id: type.id,
        name: type.name,
        monthlyBudget: type.monthlyBudget,

        spent: spending ? Math.round(spending.spent * 100) / 100 : 0,

        transactionCount: spending?.transactionCount ?? 0,
      };
    });

    res.json({
      year,
      month,
      spendingByType,
    });
  } catch (error) {
    console.error("Failed to calculate spending by type:", error);

    res.status(500).json({
      error: "Failed to calculate spending by type",
    });
  }
});

transactionsRouter.patch("/:transactionId/type", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { transactionTypeId } = req.body;

    if (!transactionTypeId) {
      return res.status(400).json({
        error: "transactionTypeId is required",
      });
    }

    const transactionType = await prisma.transactionType.findUnique({
      where: {
        id: transactionTypeId,
      },
    });

    if (!transactionType) {
      return res.status(404).json({
        error: "Transaction type not found",
      });
    }

    const transaction = await prisma.transaction.update({
      where: {
        id: transactionId,
      },
      data: {
        transactionTypeId,
      },
      include: {
        transactionType: true,
        financialAccount: {
          select: {
            id: true,
            name: true,
            subtype: true,
            mask: true,
          },
        },
      },
    });

    res.json({
      transaction,
    });
  } catch (error) {
    console.error("Failed to update transaction type:", error);

    res.status(500).json({
      error: "Failed to update transaction type",
    });
  }
});
