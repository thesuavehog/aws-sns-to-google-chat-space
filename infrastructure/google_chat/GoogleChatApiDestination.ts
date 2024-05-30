import {
	ApiDestination,
	ApiDestinationProps,
	HttpMethod,
	type IConnection,
} from 'aws-cdk-lib/aws-events';
import { GoogleChatSpaceWebhookConnection } from './GoogleChatSpaceWebhookConnection';
import type { IConstruct } from 'constructs';

/**
 * Properties for a Google Chat Space as an API destination.
 *
 * These are basically the same as {@link ApiDestinationProps} but with the `httpMethod` property
 * removed (hard coded to {@link HttpMethod.POST} in {@link GoogleChatApiDestination}) and
 * `connection` property set to optional because a new {@link GoogleChatSpaceWebhookConnection} is
 * created for you if you do not provide it.
 */
export interface IGoogleChatApiDestinationProps extends Omit<ApiDestinationProps, 'httpMethod' | 'connection'> {
	connection?: IConnection;
	space: string;
}

/**
 * Represents a Google Chat Space as an API destination.
 *
 * If {@link IGoogleChatApiDestinationProps.connection} is not provided,
 * a new {@link GoogleChatSpaceWebhookConnection} is created.
 *
 * @see {@link ApiDestination}
 */
export class GoogleChatApiDestination extends ApiDestination {

	constructor(scope: IConstruct, id: string, props: IGoogleChatApiDestinationProps) {
		const { endpoint, space } = props;
		const _props: ApiDestinationProps = {
			...props,
			httpMethod: HttpMethod.POST,
			connection: props.connection
				?? new GoogleChatSpaceWebhookConnection(scope, space),
			endpoint,
		};
		super(scope, id, _props);
	}
}
