import 'source-map-support/register';
import {
	App,
	type AppProps,
	DefaultStackSynthesizer,
	type Environment,
	Validations,
} from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { CloudWatchAlertsToGoogleChatSpaceStack } from './CloudWatchAlertsToGoogleChatSpaceStack';

const env: Environment = {
	account: process.env.CDK_DEFAULT_ACCOUNT,
	region: process.env.CDK_DEFAULT_REGION,
};

class SnsToGoogleChatSpacePipe extends App {
	constructor(props?: AppProps) {
		super(props);

		this.build();

		Validations.of(this).addPlugins(new AwsSolutionsChecks(this, {
			verbose: true,
		}));
	}

	private build(): void {

		// supress the CDK bootstrap verification resources for stacks
		// that are not going to be deployed using the CDK
		const synthesizer = new DefaultStackSynthesizer({
			generateBootstrapVersionRule: false,
		});

		const stack = new CloudWatchAlertsToGoogleChatSpaceStack(
			this,
			'CloudWatchAlertsToGoogleChatSpaceStack',
			{
				synthesizer,
				env,
			},
		);
		stack.addMetadata(
			'repo',
			stack.node.tryGetContext('metadata:repo') ?? 'https://github.com/thesuavehog/aws-sns-to-google-chat-space'
		)

	}

}

new SnsToGoogleChatSpacePipe();
