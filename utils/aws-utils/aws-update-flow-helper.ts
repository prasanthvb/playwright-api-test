import { pollGetUpdateRequest } from './aws-get-update-request-helper';
import { getCustomerByGlobalID } from './aws-api-helper';

export const runUpdateFlow = async (
  request,
  updateResponse,
  globalID
) => {
  const updateRequestID = updateResponse?.updateRequestID;

  if (!updateRequestID) {
    throw new Error('updateRequestID not returned from update API');
  }

  const updateRequestStatus = await pollGetUpdateRequest(
    request,
    updateRequestID,
    globalID
  );

  const finalStatus = updateRequestStatus?.data?.status;

  if (finalStatus !== 'active') {
    return {
      status: finalStatus,
      error: updateRequestStatus?.data?.error,
      updateRequestID,
    };
  }

  const updatedCustomer = await getCustomerByGlobalID(request, globalID);

  return {
    status: finalStatus,
    updateRequestID,
    updatedCustomer,
  };
};
