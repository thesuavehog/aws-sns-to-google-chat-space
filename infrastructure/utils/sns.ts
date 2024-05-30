import {
	Arn,
	Aws,
	Stack,
} from 'aws-cdk-lib';
import { type IConstruct } from 'constructs';
import { type ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { hash } from './hash';

const _topics: Record<string, ITopic> = {};

/**
 * A type guard to determine if a given object is an instance of {@link ITopic}.
 *
 * @param ref The object to check.
 * @returns `true` if the object is an instance of {@link ITopic}, `false` otherwise.
 */
export function isITopic(ref: unknown): ref is ITopic {
	if (!ref || typeof ref !== 'object') { return false; }
	return 'topicArn' in ref && typeof ref.topicArn === 'string'
		&& 'topicName' in ref && typeof ref.topicName === 'string'
		&& 'fifo' in ref && typeof ref.fifo === 'boolean'
		&& (ref as ITopic).stack instanceof Stack
		&& 'addSubscription' in ref && typeof ref.addSubscription === 'function'
		&& 'addToResourcePolicy' in ref && typeof ref.addToResourcePolicy === 'function'
		&& 'grantPublish' in ref && typeof ref.grantPublish === 'function'
	;
}

/**
 * Returns an {@link ITopic} instance from a given reference.
 *
 * @param scope The scope in which to create the topic.
 * @param ref The ARN of a topic, the name of a topic, or an {@link ITopic} instance.
 * @param accountAgnostic Whether the topic reference is generated as account agnostic (uses {@link Aws.REGION}
 * and {@link Aws.ACCOUNT_ID} refs in the CloudFormation stack) or specific to a single account/region. This
 * affects the end result CloudFormation template (whether you can deploy it to any account/region or if the
 * template is specific to a single account/region).
 * @returns The {@link ITopic} instance.
 */
export function toTopic(
	scope: IConstruct,
	ref: `arn:aws:sns:${string}-${string}-${number}:${number}:${string}` | string | ITopic,
	accountAgnostic: boolean = false
): ITopic {
	if (isITopic(ref)) { return ref; }
	const existing: ITopic | undefined = _topics[ref];
	if (existing) { return existing; }
	if (!ref.match(/arn:aws:sns:[a-z]{2}-[a-z]{4,10}-\d:\d{12}:[a-zA-Z0-9_-]{3,256}/)) {
		if (!ref.match(/[a-zA-Z0-9_-]{3,256}/)) {
			throw new Error(`Invalid SNS Topic ARN or Topic Name: ${ref}`);
		}
		ref = Arn.format({
			partition: 'aws',
			service: 'sns',
			region: accountAgnostic ? Aws.REGION : Stack.of(scope).region,
			account: accountAgnostic ? Aws.ACCOUNT_ID : Stack.of(scope).account,
			resource: ref,
		});
	}
	const topic: ITopic = Topic.fromTopicArn(scope, hash(ref), ref);
	_topics[ref] = topic;
	return topic;
}
