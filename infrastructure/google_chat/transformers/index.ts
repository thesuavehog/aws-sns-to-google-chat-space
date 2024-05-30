import { IInputTransformation } from '@raphaelmanke/aws-cdk-pipes-rfc';
import { StateValue } from '@aws-sdk/client-cloudwatch';

const cloudwatch = {
	ALARM: require('./cloudwatch-alarm-ALARM.json'),
	OK: require('./cloudwatch-alarm-OK.json'),
};

/**
 * @see {@link getCloudWatchAlarm} to use these values as templates where you can
 * specify key/values to replace in them at synth or deploy time.
 */
export const CloudWatchAlarm: Readonly<Record<keyof typeof StateValue, Readonly<IInputTransformation>>> = {
	ALARM: {
		inputTemplate: JSON.stringify(cloudwatch.ALARM),
	},
	OK: {
		inputTemplate: JSON.stringify(cloudwatch.OK),
	},
	INSUFFICIENT_DATA: {
		inputTemplate: JSON.stringify(cloudwatch.ALARM),
	},
};

/**
 * Replace the key/value pairs in the input template with the values in the replace object.
 *
 * @param state The state value to get the CloudWatch Alarm input template for.
 * @param replace The key/value pairs to replace in the input template.
 * @returns The input transformation with the replacements applied to the `inputTemplate`.
 */
export function getCloudWatchAlarm(state: StateValue, replace?: Record<string, string>): IInputTransformation {
	const result: IInputTransformation = CloudWatchAlarm[ state ];
	if (!replace) { return result; }
	return {
		inputTemplate: Object.entries(replace).reduce(
			(acc, [ key, value ]) =>
				// eslint-disable-next-line security/detect-non-literal-regexp
				acc.replace(new RegExp(`{{${key}}}`, 'g'), value),
			result.inputTemplate
		),
	}
}
