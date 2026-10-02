import express from "express";

import { plaidRouter } from "./routes/plaid";
import { accountsRouter } from "./routes/accounts";
import { transactionsRouter } from "./routes/transactions";
import { transactionTypesRouter } from "./routes/transactionTypes";
import { devRouter } from "./routes/dev";

export const app = express();

app.use(express.json());

app.use("/plaid", plaidRouter);
app.use("/accounts", accountsRouter);
app.use("/transactions", transactionsRouter);
app.use("/transaction-types", transactionTypesRouter);

if (process.env.NODE_ENV !== "production") {
  app.use("/dev", devRouter);
}
