import {
	Authorization,
	Connection,
	type ConnectionProps,
	HttpParameter
} from 'aws-cdk-lib/aws-events';
import { SecretValue } from 'aws-cdk-lib';
import type { IConstruct } from 'constructs';

/**
 * EventBridge Api Connections require authentication to be defined, but the Google Chat Space API for posting
 * messages uses query parameters (`key` & `token`) instead of header-based authentication.
 *
 * This interface extends the ConnectionProps interface to remove the `authorization` property to make it clear
 * that is not used on a Google Chat Space Webhook Connection.
 *
 * @see {@link ConnectionProps}
 */
export interface IGoogleChatSpaceWebhookConnectionProps extends Omit<ConnectionProps, 'authorization'> {
}

/**
 * A thin extension of the Connection class that sets a default `content-type` header for Google Chat Space
 * Webhook connections and passes a dummy `authorization` value up to {@link Connection} because this value
 * is not used by the Google Chat Space webhook but it is required by EventBridge to be defined for a Connection.
 *
 @see {@link Connection}
 @see {@link IGoogleChatSpaceWebhookConnectionProps}
 */
export class GoogleChatSpaceWebhookConnection extends Connection {

	public constructor(scope: IConstruct, id: string, props?: IGoogleChatSpaceWebhookConnectionProps) {
		id = id.match(new RegExp(/^\$\{Token\[TOKEN\.\d+/)) ? 'Connection' : id;
		super(scope, id, {
			...props,
			authorization: Authorization.apiKey('dummy', SecretValue.unsafePlainText('key')),
			headerParameters: {
				'content-type': HttpParameter.fromString('application/json;charset=utf-8'),
				...props?.headerParameters,
			},
		});
	}
}
