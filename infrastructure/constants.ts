/**
 * Input Transformer to extract the SQS Message Body from an SQS Event which contains
 * an SNS Message that was delivered with `rawMessageDelivery: true` (the SNS envelope
 * is in the SQS Message).
 */
export const TRANSFORM_SQS_BODY_SNS_RAW: string = '<$.body.Message>';

/**
 * Input Transformer to extract the SQS Message Body from an SQS Event which contains
 * an SNS Message that was delivered with `rawMessageDelivery: false` (the SNS envelope
 * is NOT in the SQS Message).
 *
 * NOTE: this will only work if the SQS Message Body is a _string_. If it is stringified JSON, see: {@link TRANSFORM_SQS_BODY_TO_DATA}.
 */
export const TRANSFORM_SQS_BODY: string = '<$.body>';

/**
 * `<$.body>` does not work as an InputTransformer when you need JSON output even though the Pipes
 * web console shows it will work (bug in the Pipes Web Console - confirmed by AWS Support)
 * so `{"_data_": <$.body>}` is used instead as that will force Pipes to parse the string as
 * JSON.
 */
export const TRANSFORM_SQS_BODY_TO_DATA: string = '{"_data_":<$.body>}';
