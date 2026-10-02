import { plaidClient } from "../plaid";
import { prisma } from "../prisma";

export async function syncPlaidTransactions(
  accessToken: string,
  plaidItemId: string,
  cursor?: string | null,
) {
  let nextCursor = cursor ?? undefined;
  let hasMore = true;

  let addedCount = 0;
  let modifiedCount = 0;
  let removedCount = 0;

  while (hasMore) {
    const response = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: nextCursor,
    });

    const { added, modified, removed, next_cursor, has_more } = response.data;

    for (const transaction of added) {
      await prisma.transaction.upsert({
        where: {
          id: transaction.transaction_id,
        },
        update: {
          financialAccountId: transaction.account_id,
          name: transaction.name,
          merchantName: transaction.merchant_name ?? null,
          amount: transaction.amount,
          date: new Date(transaction.date),
          pending: transaction.pending,
          category: transaction.personal_finance_category?.primary ?? null,
        },
        create: {
          id: transaction.transaction_id,
          financialAccountId: transaction.account_id,
          name: transaction.name,
          merchantName: transaction.merchant_name ?? null,
          amount: transaction.amount,
          date: new Date(transaction.date),
          pending: transaction.pending,
          category: transaction.personal_finance_category?.primary ?? null,
        },
      });
    }

    for (const transaction of modified) {
      await prisma.transaction.upsert({
        where: {
          id: transaction.transaction_id,
        },
        update: {
          financialAccountId: transaction.account_id,
          name: transaction.name,
          merchantName: transaction.merchant_name ?? null,
          amount: transaction.amount,
          date: new Date(transaction.date),
          pending: transaction.pending,
          category: transaction.personal_finance_category?.primary ?? null,
        },
        create: {
          id: transaction.transaction_id,
          financialAccountId: transaction.account_id,
          name: transaction.name,
          merchantName: transaction.merchant_name ?? null,
          amount: transaction.amount,
          date: new Date(transaction.date),
          pending: transaction.pending,
          category: transaction.personal_finance_category?.primary ?? null,
        },
      });
    }

    for (const transaction of removed) {
      await prisma.transaction.deleteMany({
        where: {
          id: transaction.transaction_id,
        },
      });
    }

    addedCount += added.length;
    modifiedCount += modified.length;
    removedCount += removed.length;

    nextCursor = next_cursor;
    hasMore = has_more;
  }

  await prisma.plaidItem.update({
    where: {
      id: plaidItemId,
    },
    data: {
      cursor: nextCursor,
    },
  });

  return {
    addedCount,
    modifiedCount,
    removedCount,
  };
}
