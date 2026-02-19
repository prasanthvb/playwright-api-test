import { faker } from '@faker-js/faker';

const terms = ['credit', 'cod'];
interface PaymentDetails {
  terms?: string;
  cadence: string;
  creditLimit?: number;
}

const cadenceMap: Record<string, string> = {
  credit: 'NT15',
  cod: 'CCOD',
};

export const getValidPaymentDetailsPayload = (): { paymentDetails: PaymentDetails } => {
  const selectedTerm = faker.helpers.arrayElement(terms);
  const cadence = cadenceMap[selectedTerm] ?? 'unknown';

  return {
    paymentDetails: {
      terms: selectedTerm,
      cadence,
      creditLimit: faker.number.int({ min: 1000, max: 10000 }),
    },
  };
};

export const missingPaymentTermsPayload = () => ({
  paymentDetails: {
    cadence: 'NT15',
    creditLimit: faker.number.int({ min: 1000, max: 10000 }),
  },
});

export const missingPaymentCreditLimitPayload = () => ({
  paymentDetails: {
    terms: faker.helpers.arrayElement(terms),
    cadence: 'NT15',
  },
});
