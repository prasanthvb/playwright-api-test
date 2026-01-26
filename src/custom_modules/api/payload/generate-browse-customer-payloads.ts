import data from '../../../data/api-data/test-data.json';

interface BrowsePayload {
  sortToken?: string;
  sortDirection?: string;
  pageSize: number;
  state?: string;
  filterValue?: string;
}

/**
 * Returns a random item from an array (helper)
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate payload for Browse Customer API based on scenario type
 * Includes random sortToken and sortDirection
 */
export function generateBrowseCustomerPayload(scenario: string): BrowsePayload {
  // Randomly select sortToken and sortDirection (can be blank)
  const sortTokenOptions = ['', data.sortTokenTime, data.sortTokenAccountName];
  const sortDirectionOptions = ['', data.sortDirectionAsc, data.sortDirectionDesc];

  const basePayload: BrowsePayload = {
    sortToken: randomChoice(sortTokenOptions),
    sortDirection: randomChoice(sortDirectionOptions),
    pageSize: data.pageSize,
  };

  switch (scenario) {
    case 'validStateOnly':
      return { ...basePayload, state: data.validState1 };

    case 'validStateWithAccountName':
      return {
        ...basePayload,
        state: data.validState1,
        filterValue: data.accountNameFilter,
      };

    case 'validStateWithLicense':
      return {
        ...basePayload,
        state: data.validState1,
        filterValue: 'BQ1116872',
      };

    case 'validStateWithNonMatchingFilter':
      return {
        ...basePayload,
        state: data.validState1,
        filterValue: 'NONEXISTENT',
      };

    case 'validStateWithUnsupportedFilter':
      return {
        ...basePayload,
        state: data.validState1,
        filterValue: 'InvalidKey',
      };

    case 'invalidState':
      return {
        ...basePayload,
        state: 'ZZ',
        filterValue: data.accountNameFilter,
      };

    case 'missingState':
      return {
        ...basePayload,
        filterValue: data.accountNameFilter,
      };

    case 'unauthorized':
      return {
        ...basePayload,
        state: data.validState1,
      };

    default:
      throw new Error(`Unknown browse payload scenario: ${scenario}`);
  }
}
