import { prisma } from "../src/prisma";

console.log("SEED FILE STARTED");

const transactionTypes = [
  "Groceries",
  "Restaurants & Dining",
  "Coffee",
  "Shopping",
  "Entertainment",
  "Gas",
  "Transportation",
  "Travel",
  "Housing",
  "Utilities",
  "Phone & Internet",
  "Insurance",
  "Healthcare",
  "Fitness",
  "Personal Care",
  "Subscriptions",
  "Education",
  "Pets",
  "Gifts & Donations",
  "Taxes",
  "Fees",
  "Transfers",
  "Credit Card Payments",
  "Income",
  "Other",
];

async function main() {
  console.log("Starting seed...");

  for (const name of transactionTypes) {
    console.log(`Creating: ${name}`);

    await prisma.transactionType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("Transaction types seeded.");
}

main()
  .catch((error) => {
    console.error("SEED ERROR:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
