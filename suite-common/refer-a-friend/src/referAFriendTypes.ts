export type ReferralError = {
    message: string;
    httpStatus?: number;
    // The `error` field of the API response body, or the Connect error code.
    code?: string;
};
