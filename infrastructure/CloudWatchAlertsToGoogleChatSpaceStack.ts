import {
	CfnParameter,
	Stack,
	type StackProps
} from 'aws-cdk-lib';
import { FilterOrPolicy, SubscriptionFilter } from 'aws-cdk-lib/aws-sns';
import {
	GoogleChatApiDestination,
	GoogleChatSpaceWebhookConnection,
	GoogleChatTransformers
} from './google_chat';
import { SnsToApiDestinationPipe } from './pipes/SnsToApiDestinationPipe';
import type { IConstruct } from 'constructs';
import type { StateValue } from '@aws-sdk/client-cloudwatch';

/**
 * The structure of the Google Chat configuration that can be defined in the Context of the stack.
 *
 * E.g. `cdk.context.json`
 * ```
 * {
 *  "GoogleChatConfig": {
 *   "MessageTitle": "ProjectA",
 *   "MessageIcon": "https://projecta.com/favicon.png",
 *   "Space": {
 *     "Label": "ProjectA_Alerts",
 *     "Endpoint": "https://chat.googleapis.com/v1/spaces/AAAAeusufh7/messages?key=AIzaSyDkq&token=sdidfd
 *   }
 * }
 * ```
 *
 * These values can also be set in a flat context structure in `cdk.context.json`:
 * ```
 * {
 *   "GoogleChatMessageTitle": "ProjectA",
 *   "GoogleChatMessageIcon": "https://projecta.com/favicon.png",
 *   "GoogleChatSpaceLabel": "ProjectA_Alerts",
 *   "GoogleChatSpaceEndpoint": "https://chat.googleapis.com/v1/spaces/AAAAeusufh7/messages?key=AIzaSyDkq&token=sdidfd
 * }
 * ```
 *
 * These values can also be set as parameters in the stack (e.g. `cdk deploy --parameters GoogleChatMessageTitle=ProjectA`).
 *
 * These values can also be set as Context values on the cdk command line (e.g. `cdk deploy --context GoogleChatMessageTitle=ProjectA`).
 */
export interface IGoogleChatConfig {
	MessageTitle: string;
	MessageIcon: string;
	Space: {
		Label: string;
		Endpoint: string;
	}
}

/**
 * Reserved for future use.
 */
export interface ICloudWatchAlertsToGoogleChatSpaceStackStackProps extends StackProps {

}

/**
 * A stack that creates an SNS topic and an API destination that forwards messages to a Google Chat space or Slack Webhook.
 * To use an existing SNS Topic, set the `SourceSNSTopic` context value to the ARN of the existing topic.
 *
 * Configuration of the Google Chat Space and message is done via the `GoogleChatConfig` context value,
 * individual context properties, or stack parameters. See {@link IGoogleChatConfig} for details on how
 * to define the configuration.
 *
 * @see {@link IGoogleChatConfig}
 */
export class CloudWatchAlertsToGoogleChatSpaceStack extends Stack {

	private _googleChatConfig?: IGoogleChatConfig;
	public get GoogleChatConfig(): IGoogleChatConfig {
		return this._googleChatConfig ??= this.getGoogleChatConfig(this);
	}

	constructor(scope: IConstruct, id: string, props?: ICloudWatchAlertsToGoogleChatSpaceStackStackProps) {
		props = {
			description:
			'An AWS CDK stack that creates an SNS topic and an API destination that forwards messages to a Google Chat space or Slack Webhook.',
			...props,
		};
		super(scope, id, props);

		const sourceSnsTopic: string = this.findContextOrParameter('SourceSNSTopic') || (
			new CfnParameter(this, 'SourceSNSTopic', {
				type: 'String',
				description: 'The name or ARN of the SNS topic that will be used as the source for the pipe.',
			})
		).valueAsString;

		{
			const { MessageTitle, MessageIcon } = this.GoogleChatConfig;
			const { Label, Endpoint } = this.GoogleChatConfig.Space;

			const connection = new GoogleChatSpaceWebhookConnection(this, Label);
			const destination = new GoogleChatApiDestination(this, 'ApiDestination', {
				description: `Forward messages to Google Chat space ${Label}`,
				connection,
				space: Label,
				endpoint: Endpoint,
			});

			([ 'OK', 'ALARM' ] as (keyof typeof StateValue)[]).forEach((state) => {
				new SnsToApiDestinationPipe(this, `GoogleChat-CloudWatchAlarm-${state}`, {
					source: {
						topic: sourceSnsTopic,
						subscriptionProps: {
							filterPolicyWithMessageBody: {
								AlarmArn: FilterOrPolicy.filter(SubscriptionFilter.existsFilter())
							}
						},
					},
					target: {
						destination,
						inputTemplate: GoogleChatTransformers.getCloudWatchAlarm(state, { title: MessageTitle, icon: MessageIcon }),
					},
					description: `Forward CloudWatch Alert messages from SNS to Google Chat space ${Label}`,
				});
			});
		}

	}

	/**
	 * Load the Google Chat configuration from the stack context. This is done by reading the context
	 * values and creating {@link CfnParameter} resources for the values that are not set in the context.
	 *
	 * This should not be called directly, it should be used by accessing the {@link IGoogleChatConfig}
	 * property which will call this if the config is not already loaded.
	 *
	 * This function is idempotent and will not create duplicate {@link CfnParameter} resources, but if
	 * you have created resources with the same IDs as are used in this function, there will be conflicts
	 * and the synth will fail.
	 *
	 * @param stack the {@link Stack} to load the context values from
	 * @returns the Google Chat configuration derived from the stack context and/or created {@link CfnParameter}
	 * resources based upon what values are not set in the context
	 */
	protected getGoogleChatConfig(stack: Stack): IGoogleChatConfig {

		const googleChatConfig: IGoogleChatConfig = stack.node.tryGetContext('GoogleChatConfig') || {};

		googleChatConfig.MessageTitle ??= this.findContextOrParameter('GoogleChatMessageTitle')
		|| (new CfnParameter(this, 'GoogleChatMessageTitle', {
			type: 'String',
			description: 'The title used on the Google Chat message that is sent.',
		})).valueAsString;

		googleChatConfig.MessageIcon ??= this.findContextOrParameter('GoogleChatMessageIcon')
			|| (new CfnParameter(this, 'GoogleChatMessageIcon', {
				type: 'String',
				description: 'The icon used on the Google Chat message that is sent.',
			})).valueAsString;

		const getLabel = () => (
			this.findContextOrParameter('GoogleChatSpaceLabel')
			|| (new CfnParameter(this, 'GoogleChatSpaceLabel', {
				type: 'String',
				description: 'The label for the Google Chat space to send messages to (e.g. "Alerts").',
			})).valueAsString);
		const getEndpoint = () => (
			this.findContextOrParameter('GoogleChatSpaceEndpoint')
			|| (new CfnParameter(this, 'GoogleChatSpaceEndpoint', {
				type: 'String',
				description: 'The endpoint of the Google Chat space to send messages to that includes key and token query parameters (e.g. https://chat.googleapis.com/v1/spaces/AAAAeusufh7/messages?key=AIzaSyDkq&token=sdidfdadkjhb',
				noEcho: true,
			})).valueAsString
		);
		if (!googleChatConfig.Space) {
			googleChatConfig.Space = {
				Label: getLabel(),
				Endpoint: getEndpoint(),
			};
		} else {
			googleChatConfig.Space.Label ??= getLabel();
			googleChatConfig.Space.Endpoint ??= getEndpoint();
		}
		return googleChatConfig;
	}

	/**
	 * Check if a {@link CfnParameter} with the given ID exists in the stack and return it if it does.
	 *
	 * @param id the ID of the {@link CfnParameter} to find
	 * @param stack the {@link Stack} to search for the {@link CfnParameter} in (defaults to the current stack)
	 * @returns the {@link CfnParameter} with the given ID if it exists in the stack
	 */
	protected findExistingParameter = (id: string, stack: Stack = this): CfnParameter | undefined => {
		let _existing: IConstruct | undefined;
		(_existing = stack.node.tryFindChild(id)) instanceof CfnParameter ? _existing : undefined;
		return _existing as CfnParameter;
	};

	/**
	 * Given an ID, find the value of the context with that ID in the stack or the string value (token) of any
	 * existing {@link CfnParameter} with that ID. {@link CfnParameter.valueAsString} is used to get the
	 * value of a parameter as the result of this function is intended to be used where you need a resolve
	 * OR unresolved value for the ID. I.e. you accept a Token that CloudFormation will use via Ref to
	 * determine the resolved value at deploy time.
	 *
	 * DO NOT use this if you require the value to be resolved at synth time.
	 *
	 * @param id the ID of the context or parameter to find
	 * @param stack the stack to search for the context or parameter in (defaults to the current stack)
	 * @returns the value of the context with the given ID or the string value (token) of the existing parameter with that ID
	 */
	protected findContextOrParameter = (id: string, stack: Stack = this): string | undefined => {
		return stack.node.tryGetContext(id) || this.findExistingParameter(id, stack)?.valueAsString;
	}

}
