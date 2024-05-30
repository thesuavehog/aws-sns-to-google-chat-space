import {
	ApiDestinationTarget,
	type IInputTransformation,
	type IPipe,
	type IPipeProps,
	Pipe,
	SqsSource,
} from '@raphaelmanke/aws-cdk-pipes-rfc';
import {
	CfnCondition,
	CfnResource,
	Token,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
	type IQueue,
	Queue,
	QueueEncryption,
} from 'aws-cdk-lib/aws-sqs';
import { type ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { NagSuppressions } from 'cdk-nag';
import { SqsSubscription, type SqsSubscriptionProps } from 'aws-cdk-lib/aws-sns-subscriptions';
import { TRANSFORM_SQS_BODY_SNS_RAW } from '../constants';
import { toTopic } from '../utils';
import type { IApiDestination } from 'aws-cdk-lib/aws-events';

export interface ISnsToApiDestinationPipeProps extends Omit<IPipeProps, 'source' | 'target'> {

	/**
	 * Defines the {@link ITopic} which will be the **source** for all messages published to the
	 * pipe as well as any specific subscription properties to be applied.
	 */
	source: {
		/**
		 * The SNS Topic which will be the source for all messages published to the pipe.
		 * Use the `subscriptionProps` property to limit
		 * the messages that are processed into the pipe from this topic.
		 */
		topic: string | ITopic;

		/**
		 * Allows for advanced customization of the subscription to the SNS topic.
		 * Use this when you need to add a filter policy to the subscription or a dead letter queue.
		 */
		subscriptionProps?: Partial<SqsSubscriptionProps>;
	};

	/**
	 * Defines the {@link IApiDestination} which will be the **target** for all messages that come through
	 * the {@link ISnsToApiDestinationPipeProps.source|source} topic and meet the subscription criteria. Use the
	 * `inputTemplate` to define a transformation that will be applied to the message before it is sent to
	 * the target.
	 */
	target: {
		destination: IApiDestination | ApiDestinationTarget;

		/**
		 * Used to transform the input from the {@link ISnsToApiDestinationPipeProps.source|source} to the message
		 * sent to {@link ISnsToApiDestinationPipeProps.target|target}
		 *
		 * @see https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes-input-transformation.html
		 */
		inputTemplate?: IInputTransformation;
	};


	description?: string;
}

/**
 * A pipe that forwards messages from an SNS topic to an API destination.
 *
 * An intermediary SQS queue is used to buffer messages between the SNS topic and the
 * API destination because EventBridge Pipes cannit directly use an SNS Topic as a source.
 *
 * The {@link source} topic subscription can have a filter applied to it to limit the messages
 * that are processed by the pipe and the {@link target} can have an input transformation
 * applied to it before the message is sent to the API Destination.
 */
export class SnsToApiDestinationPipe extends Construct {

	/**
	 * The intermediary SQS queue that is used to buffer messages between the SNS
	 * topic and the API destination because EventBridge Pipes cannot directly use
	 * an SNS Topic as a source.
	 */
	protected intermediaryQueue: IQueue;

	/**
	 * The SNS topic which is the source for all messages published to the pipe.
	 */
	protected source: ITopic;

	/**
	 * The API destination which is the target for all messages that come through the source.
	 */
	protected target: ApiDestinationTarget;

	/**
	 * The pipe definition that defines the flow to forward messages from the source to the target.
	 */
	protected pipe: IPipe;

	protected readonly props: Readonly<ISnsToApiDestinationPipeProps>;

	constructor(scope: Construct, id: string, props: ISnsToApiDestinationPipeProps) {
		props.source.subscriptionProps = {
			rawMessageDelivery: true,
			...props.source.subscriptionProps,
		};
		super(scope, id);
		this.props = props;

		const {
			source,
			target,
			description,
		} = props;

		this.source = typeof source.topic === 'string' && Token.isUnresolved(source.topic)
			? Topic.fromTopicArn(this, 'Source', source.topic)
			: toTopic(this, source.topic);
		this.target = target.destination instanceof ApiDestinationTarget
			? target.destination
			: new ApiDestinationTarget(target.destination, {
				inputTemplate: target.inputTemplate ?? { inputTemplate: TRANSFORM_SQS_BODY_SNS_RAW },
			})
		;

		this.intermediaryQueue = new Queue(this, 'Queue', {
			enforceSSL: true,
			encryption: QueueEncryption.SQS_MANAGED,
		});
		NagSuppressions.addResourceSuppressions(
			this.intermediaryQueue,
			[
				// AwsSolutions-SQS3: The SQS queue is not used as a dead-letter queue (DLQ) and does not have a DLQ enabled.
				{ id: 'AwsSolutions-SQS3', reason: 'Delivery to EventBridge Pipes will never fail' },
			],
		);

		this.source.addSubscription(new SqsSubscription(this.intermediaryQueue, source.subscriptionProps));

		this.pipe = new Pipe(this, 'Pipe', {
			...props,
			source: new SqsSource(this.intermediaryQueue),
			target: this.target,
			description: description
				?? `Forward messages from ${this.source.topicName} to ${target.destination instanceof ApiDestinationTarget
					? target.destination.targetArn
					: target.destination.apiDestinationName}`,
		});
	}

	/**
	 * Apply a condition to all the resources created by this Construct.
	 *
	 * Typically used to supress the creation of all resources for this construct based on a condition.
	 *
	 * @param condition
	 * @see {@link CfnResource.cfnOptions}.condition
	 */
	addCondition(condition: CfnCondition): void {
		const {
			pipe,
			intermediaryQueue,
		} = this;
		[
			pipe,
			intermediaryQueue,
		].forEach(r =>
			(r.node.defaultChild as CfnResource).cfnOptions.condition = condition);
	}
}
