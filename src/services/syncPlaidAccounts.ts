import { plaidClient } from "../plaid";
import { prisma } from "../prisma";

export async function syncPlaidAccounts(
  accessToken: string,
  plaidItemId: string,
) {
  const response = await plaidClient.accountsGet({
    access_token: accessToken,
  });

  for (const account of response.data.accounts) {
    await prisma.financialAccount.upsert({
      where: {
        id: account.account_id,
      },
      update: {
        name: account.name,
        type: account.type,
        subtype: account.subtype ?? null,
        mask: account.mask ?? null,
        currentBalance: account.balances.current ?? null,
        availableBalance: account.balances.available ?? null,
        currency: account.balances.iso_currency_code ?? null,
      },
      create: {
        id: account.account_id,
        plaidItemId,
        name: account.name,
        type: account.type,
        subtype: account.subtype ?? null,
        mask: account.mask ?? null,
        currentBalance: account.balances.current ?? null,
        availableBalance: account.balances.available ?? null,
        currency: account.balances.iso_currency_code ?? null,
      },
    });
  }

  return response.data.accounts.length;
}
